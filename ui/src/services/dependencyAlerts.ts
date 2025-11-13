import type { Tags } from "@/model/tags";
import axios from "@/utils/axios";

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

export type DependencyAlert = {
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
};

export type PackageAlertSummary = {
  package: string;
  totalAlerts: number;
  openAlerts: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  violations: number;
  repositories: string[];
};

export type DependencyAlertsAnalysis = {
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
};

export async function fetchDependencyAlerts(
  workloadIds: string[],
  tags: Tags,
  repo: string,
  repoGroups: string[],
): Promise<DependencyAlertsAnalysis[]> {
  const params: Record<string, string> = {
    workloadIds: workloadIds.join(","),
    tags: tags.map((t) => `${t.key}=${t.value}`).join(","),
  };

  if (repo) {
    params.repo = repo;
  }

  if (repoGroups && repoGroups.length > 0) {
    params.repoGroups = repoGroups.join(",");
  }

  const response = await axios.get("/api/security/dependency-alerts", {
    params,
  });

  return response.data;
}

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
