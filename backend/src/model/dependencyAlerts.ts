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

export type MultiWorkloadDependencyAlertsResponse = {
  results: DependencyAlertsAnalysis[];
};
