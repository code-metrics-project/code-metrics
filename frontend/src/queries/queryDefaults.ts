import type { QueryArgs } from "@/components/inputs";

/**
 * Get the date N days ago from today, truncated to date only (no time component)
 */
function getOffsetDate(offsetDays: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return truncateDateOnly(date);
}

/**
 * Truncate a date to date only (no time component)
 */
function truncateDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get default inputs for code quality queries (coverage, repo-churn, etc.)
 * Matches the Vue app's default values:
 * - workloads: [] (WorkloadNames component will auto-select all workloads)
 * - repoGroups: []
 * - tags: []
 * - startDate: 30 days ago
 * - endDate: today
 */
export function getCodeQualityDefaults(): QueryArgs {
  return {
    workloads: [],
    repoGroups: [],
    tags: [],
    startDate: getOffsetDate(-30),
    endDate: truncateDateOnly(new Date()),
  };
}

/**
 * Get default inputs for pipeline queries (deployment-frequency, pipeline-runs, etc.)
 */
export function getPipelineDefaults(): QueryArgs {
  return {
    workloads: [],
    jobGroups: [],
    tags: [],
    startDate: getOffsetDate(-30),
    endDate: truncateDateOnly(new Date()),
  };
}

/**
 * Get default inputs for issue queries (bugs-new, bugs-open, etc.)
 */
export function getIssueDefaults(): QueryArgs {
  return {
    workloads: [],
    tags: [],
    startDate: getOffsetDate(-30),
    endDate: truncateDateOnly(new Date()),
  };
}

/**
 * Get default inputs for incident queries (production-incidents, time-to-restore-service, etc.)
 */
export function getIncidentDefaults(): QueryArgs {
  return {
    workloads: [],
    tags: [],
    startDate: getOffsetDate(-30),
    endDate: truncateDateOnly(new Date()),
  };
}
