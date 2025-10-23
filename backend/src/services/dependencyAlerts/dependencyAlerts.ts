import { Octokit } from "@octokit/rest";
import { DependencyAlert, DependencyAlertState, DependencyAlertsAnalysis, DependencySeverity } from "../../model/dependencyAlerts";
import { getAllCodeManagementConfig, getWorkloadById } from "../../config/configMapping";
import { error, logger, warn } from "../../utils/logger/logger";
import { WorkloadId } from "../../model/config/workload-config";
import { CodeManagementTypes } from "../../model/config/common";
import { getReposForWorkloadId } from "../../utils/repos";
import { getConfigItemAsNumber } from "../../config/sources/source";

const SLA_CONFIG: Record<DependencySeverity, number> = {
  [DependencySeverity.Critical]: getConfigItemAsNumber("DEPENDENCY_ALERT_CRITICAL", 7),
  [DependencySeverity.High]: getConfigItemAsNumber("DEPENDENCY_ALERT_HIGH", 14),
  [DependencySeverity.Medium]: getConfigItemAsNumber("DEPENDENCY_ALERT_MEDIUM", 30),
  [DependencySeverity.Low]: getConfigItemAsNumber("DEPENDENCY_ALERT_LOW", 60),
};

export class DependencyAlertsService {
  private connections = new Map<WorkloadId, Octokit>();

  private getConnection(workloadId: WorkloadId): Octokit {
    let connection = this.connections.get(workloadId);
    if (!connection) {
      const workload = getWorkloadById(workloadId);
      const serverId = workload.codeManagement.serverId;
      const server = getAllCodeManagementConfig().github.servers.find((server) => server.id === serverId);
      if (!server) {
        throw new Error(`No GitHub server configuration found named: ${serverId}`);
      }
      connection = new Octokit({
        auth: server.apiKey,
        baseUrl: server.url,
      });
      this.connections.set(workloadId, connection);
    }
    return connection;
  }

  private calculateAlertAge(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  private checkSLAViolation(alert: any, age: number) {
    const severity = alert.security_advisory?.severity?.toLowerCase() as DependencySeverity;
    const slaLimit = SLA_CONFIG[severity] || 0;
    
    const violation = age > slaLimit;
    const daysOverdue = violation ? age - slaLimit : 0;
    
    return {
      violation,
      age,
      slaLimit,
      daysOverdue,
      severity,
    };
  }

  async fetchDependencyAlerts(
    workloadId: WorkloadId,
    repo?: string,
    repoGroups?: string[]
  ): Promise<DependencyAlertsAnalysis[]> {
    try {
      const workload = getWorkloadById(workloadId);
      
      if (workload.codeManagement.type !== CodeManagementTypes.GITHUB) {
        warn(`Workload ${workloadId} does not use GitHub - dependency alerts not supported`);
        return [];
      }
      
      const owner = workload.codeManagement.projectName;
      
      // Determine which repos to fetch alerts for
      let repos: string[] = [];
      if (repo) {
        repos = [repo];
      } else if (repoGroups && repoGroups.length > 0) {
        repos = await getReposForWorkloadId(repoGroups, workloadId);
        logger(`Resolved repo groups [${repoGroups.join(", ")}] to repos: ${repos.join(", ")}`);
      }
      
      if (repos.length === 0) {
        warn(`No repositories found for workload ${workloadId}`);
        return [];
      }
      
      const connection = this.getConnection(workloadId);
      const analyses: DependencyAlertsAnalysis[] = [];
      
      // Fetch alerts for each repo
      for (const repoName of repos) {
        logger(`Fetching dependency alerts for ${owner}/${repoName}`);
        
        try {
          const { data: alerts } = await connection.request('GET /repos/{owner}/{repo}/dependabot/alerts', {
            owner,
            repo: repoName,
            headers: {
              'X-GitHub-Api-Version': '2022-11-28'
            }
          });
          
          logger(`Found ${alerts.length} dependency alerts for ${repoName}`);
          analyses.push(this.analyzeAlerts(workloadId, repoName, alerts));
        } catch (err: any) {
          if (err.status === 404) {
            warn(`Repository ${owner}/${repoName} not found or Dependabot alerts not accessible`);
            analyses.push(this.emptyAnalysis(workloadId, repoName, "Repository not found or accessible"));
          } else if (err.message && err.message.includes('archived repositories')) {
            warn(`Repository ${owner}/${repoName} is archived - Dependabot alerts not available`);
            analyses.push(this.emptyAnalysis(workloadId, repoName, "Repository archived - alerts not available"));
          } else {
            error(`Error fetching alerts for repository ${owner}/${repoName} - Dependabot alerts not available`);
            analyses.push(this.emptyAnalysis(workloadId, repoName, "Error fetching alerts"));
          }
        }
      }
      
      return analyses;
    } catch (error: any) {
      throw new Error(`Error fetching dependency alerts: ${error.message}`);
    }
  }

  async fetchDependencyAlertsForWorkloads(
    workloadIds: WorkloadId[],
    repo?: string,
    repoGroups?: string[]
  ): Promise<DependencyAlertsAnalysis[]> {
    const results: DependencyAlertsAnalysis[] = [];
    
    for (const workloadId of workloadIds) {
      const analyses = await this.fetchDependencyAlerts(workloadId, repo, repoGroups);
      results.push(...analyses);
    }
    
    return results;
  }

  private analyzeAlerts(workloadId: string, repo: string, alerts: any[]): DependencyAlertsAnalysis {
    const analysis: DependencyAlertsAnalysis = {
      workloadId,
      repo,
      total: alerts.length,
      byState: {},
      bySeverity: {},
      byPackage: {},
      slaViolations: [],
      compliant: [],
      summary: {
        totalViolations: 0,
        complianceRate: "0",
        openViolations: 0,
      },
    };

    alerts.forEach((alert) => {
      const state = alert.state as DependencyAlertState;
      const severity = alert.security_advisory?.severity?.toLowerCase() as DependencySeverity;
      const age = this.calculateAlertAge(alert.created_at);
      const slaCheck = this.checkSLAViolation(alert, age);
      const packageName = alert.dependency?.package?.name || 'Unknown';
      
      // Count by state
      analysis.byState[state] = (analysis.byState[state] || 0) + 1;
      
      // Count by severity
      analysis.bySeverity[severity] = (analysis.bySeverity[severity] || 0) + 1;
      
      // Count by package
      if (!analysis.byPackage[packageName]) {
        analysis.byPackage[packageName] = {
          package: packageName,
          totalAlerts: 0,
          openAlerts: 0,
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          violations: 0,
          repositories: [],
        };
      }
      
      const pkgSummary = analysis.byPackage[packageName];
      pkgSummary.totalAlerts++;
      
      if (state === DependencyAlertState.Open) {
        pkgSummary.openAlerts++;
      }
      
      // Count by severity for this package
      if (severity === DependencySeverity.Critical) pkgSummary.criticalCount++;
      else if (severity === DependencySeverity.High) pkgSummary.highCount++;
      else if (severity === DependencySeverity.Medium) pkgSummary.mediumCount++;
      else if (severity === DependencySeverity.Low) pkgSummary.lowCount++;
      
      if (slaCheck.violation && state === DependencyAlertState.Open) {
        pkgSummary.violations++;
      }
      
      // Add repository if not already present
      if (!pkgSummary.repositories.includes(repo)) {
        pkgSummary.repositories.push(repo);
      }
      
      // Build alert info
      const alertInfo: DependencyAlert = {
        number: alert.number,
        state: state,
        severity: severity,
        age: slaCheck.age,
        slaLimit: slaCheck.slaLimit,
        daysOverdue: slaCheck.daysOverdue,
        title: alert.security_advisory?.summary || 'No title',
        package: packageName,
        createdAt: alert.created_at,
        updatedAt: alert.updated_at,
        htmlUrl: alert.html_url,
      };
      
      if (slaCheck.violation && state === DependencyAlertState.Open) {
        analysis.slaViolations.push(alertInfo);
      } else {
        analysis.compliant.push(alertInfo);
      }
    });

    // Calculate summary statistics
    const compliantCount = analysis.compliant.length + analysis.slaViolations.filter((a) => a.state !== DependencyAlertState.Open).length;
    analysis.summary = {
      totalViolations: analysis.slaViolations.length,
      complianceRate: analysis.total > 0 ? ((compliantCount / analysis.total) * 100).toFixed(1) : "100",
      openViolations: analysis.slaViolations.filter((a) => a.state === DependencyAlertState.Open).length,
    };

    return analysis;
  }

  private emptyAnalysis(workloadId: string, repo: string, warningMessage: string): DependencyAlertsAnalysis {
    return {
      workloadId,
      repo,
      warningMessage,
      total: 0,
      byState: {},
      bySeverity: {},
      byPackage: {},
      slaViolations: [],
      compliant: [],
      summary: {
        totalViolations: 0,
        complianceRate: "100",
        openViolations: 0,
      },
    };
  }
}

export const dependencyAlertsService = new DependencyAlertsService();
