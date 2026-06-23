import type { QueryArgs } from "@/components/inputs";
import { getOffsetDate, truncateDateOnly } from "@/utils/date";

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
    startDate: truncateDateOnly(getOffsetDate(-30)),
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
    startDate: truncateDateOnly(getOffsetDate(-30)),
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
    startDate: truncateDateOnly(getOffsetDate(-30)),
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
    startDate: truncateDateOnly(getOffsetDate(-30)),
    endDate: truncateDateOnly(new Date()),
  };
}
