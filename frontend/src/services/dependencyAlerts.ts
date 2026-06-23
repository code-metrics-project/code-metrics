import type { Tags } from "@/model/tags";
import client from "@/api/client";

export enum DependencySeverity {
  Critical = "critical",
  High = "high",
  Medium = "medium",
  Low = "low",
}

export enum DependencyAlertState {
  Open = "open",
  Dismissed = "dismissed",
  Fixed = "fixed",
}

export interface DependencyAlert {
  number: number;
  state: DependencyAlertState;
  severity: DependencySeverity;
  package: string;
  age: number;
  slaLimit: number;
  daysOverdue: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface PackageAlertSummary {
  package: string;
  totalAlerts: number;
  openAlerts: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  violations: number;
  repositories: string[];
}

export interface DependencyAlertsAnalysis {
  workloadId: string;
  repo: string;
  warningMessage?: string;
  total: number;
  byState: Record<string, number>;
  bySeverity: Record<string, number>;
  byPackage: Record<string, PackageAlertSummary>;
  slaViolations: DependencyAlert[];
  compliant: DependencyAlert[];
  summary: {
    totalViolations: number;
    complianceRate: string;
    openViolations: number;
  };
}

export interface DependencyAlertsRequest {
  workloads: string[];
  tags?: Tags;
  repo?: string;
  repoGroups?: string[];
}

export async function fetchDependencyAlerts(request: DependencyAlertsRequest): Promise<DependencyAlertsAnalysis[]> {
  const params = new URLSearchParams();

  // Add workloadIds as comma-separated values
  if (request.workloads && request.workloads.length > 0) {
    params.append("workloadIds", request.workloads.join(","));
  }

  // Add tags if present
  if (request.tags && request.tags.length > 0) {
    const tagsString = request.tags.map((t) => `${t.key}=${t.value}`).join(",");
    params.append("tags", tagsString);
  }

  // Add repo if present
  if (request.repo) {
    params.append("repo", request.repo);
  }

  // Add repoGroups if present
  if (request.repoGroups && request.repoGroups.length > 0) {
    params.append("repoGroups", request.repoGroups.join(","));
  }

  const response = await client.get<DependencyAlertsAnalysis[]>(`/api/security/dependency-alerts?${params.toString()}`);
  return response.data;
}

/**
 * Aggregate package alerts across multiple repository analyses.
 * This is useful for creating cross-repository vulnerability reports.
 */
export function aggregatePackageAlerts(analyses: DependencyAlertsAnalysis[]): PackageAlertSummary[] {
  const packageMap = new Map<string, PackageAlertSummary>();

  analyses.forEach((analysis) => {
    Object.values(analysis.byPackage).forEach((pkgSummary) => {
      const existingSummary = packageMap.get(pkgSummary.package);

      if (existingSummary) {
        // Merge with existing summary
        existingSummary.totalAlerts += pkgSummary.totalAlerts;
        existingSummary.openAlerts += pkgSummary.openAlerts;
        existingSummary.criticalCount += pkgSummary.criticalCount;
        existingSummary.highCount += pkgSummary.highCount;
        existingSummary.mediumCount += pkgSummary.mediumCount;
        existingSummary.lowCount += pkgSummary.lowCount;
        existingSummary.violations += pkgSummary.violations;

        // Merge repositories (avoid duplicates)
        pkgSummary.repositories.forEach((repo) => {
          if (!existingSummary.repositories.includes(repo)) {
            existingSummary.repositories.push(repo);
          }
        });
      } else {
        // Create new entry with a copy of the data
        packageMap.set(pkgSummary.package, {
          package: pkgSummary.package,
          totalAlerts: pkgSummary.totalAlerts,
          openAlerts: pkgSummary.openAlerts,
          criticalCount: pkgSummary.criticalCount,
          highCount: pkgSummary.highCount,
          mediumCount: pkgSummary.mediumCount,
          lowCount: pkgSummary.lowCount,
          violations: pkgSummary.violations,
          repositories: [...pkgSummary.repositories],
        });
      }
    });
  });

  // Convert to array and sort by violations descending
  return Array.from(packageMap.values()).sort((a, b) => b.violations - a.violations);
}
