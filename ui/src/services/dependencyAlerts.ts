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

export type DependencyAlertsAnalysis = {
  workloadId: string;
  repo: string;
  warningMessage?: string;
  total: number;
  byState: Record<string, number>;
  bySeverity: Record<string, number>;
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
  repo: string,
  repoGroups: string[],
): Promise<DependencyAlertsAnalysis[]> {
  const params: Record<string, string> = {
    workloadIds: workloadIds.join(","),
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
