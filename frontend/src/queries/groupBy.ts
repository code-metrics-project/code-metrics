import type { GroupByDimension } from "@/components/query";

/**
 * Maps query types to their supported group by dimensions.
 * This replicates the Vue app's getGroupBy functionality from queries/config.ts
 */
const queryGroupByMap: Record<string, GroupByDimension[]> = {
  "code-coverage": ["workloadId", "repoGroup", "tag"],
  "cyclomatic-complexity": ["workloadId", "repoGroup", "tag"],
  "bugs-new": ["workloadId", "tag"],
  "bugs-open": ["workloadId", "tag"],
  "change-categories": ["workloadId", "repoGroup", "tag"],
  "change-failure-rate": ["workloadId", "tag"],
  "deployment-frequency": ["workloadId", "jobGroup", "tag"],
  "lead-time-for-changes": ["workloadId", "jobGroup", "tag"],
  "lines-of-code": ["workloadId", "repoGroup", "tag"],
  "non-working-pattern": ["workloadId", "repoGroup", "tag"],
  "pipeline-runs": ["workloadId", "jobGroup", "tag"],
  "pipeline-success": ["workloadId", "jobGroup", "tag"],
  "pipeline-durations": ["workloadId", "jobGroup", "tag"],
  "production-incidents": ["workloadId", "tag"],
  "pr-open-time": ["workloadId", "repoGroup", "tag"],
  "pr-size": ["workloadId", "repoGroup", "tag"],
  "prs-per-issue": ["workloadId", "repoGroup", "tag"],
  "issues-per-pr": ["workloadId", "repoGroup", "tag"],
  "repo-churn": ["workloadId", "repoGroup", "tag"],
  "time-to-restore-service": ["workloadId", "tag"],
  vulnerabilities: ["workloadId", "repoGroup", "tag"],
};

/**
 * Get the supported group by dimensions for a list of query types.
 * Returns unique dimensions that are common across all provided query types.
 */
export function getGroupByDimensions(queryTypes: string[]): GroupByDimension[] {
  if (queryTypes.length === 0) {
    return [];
  }

  // Get dimensions for all query types
  const allDimensions = queryTypes.map((qt) => queryGroupByMap[qt] || []);

  if (allDimensions.length === 0) {
    return [];
  }

  // Find common dimensions across all queries
  const firstQueryDimensions = allDimensions[0];
  const commonDimensions = firstQueryDimensions.filter((dim) => allDimensions.every((dims) => dims.includes(dim)));

  return commonDimensions;
}
