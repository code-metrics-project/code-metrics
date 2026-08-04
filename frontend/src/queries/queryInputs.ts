import { InputType } from "@/components/inputs/inputTypes";

/**
 * Maps query types to their required input types.
 * This replicates the Vue app's registerQuery functionality from queries/queries.ts
 */
export const queryInputsMap: Record<string, InputType[]> = {
  "bugs-new": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.START_DATE, InputType.ISSUE_FILTER],
  "bugs-open": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.START_DATE, InputType.ISSUE_FILTER],
  "change-categories": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "change-failure-rate": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.START_DATE, InputType.INCIDENT_FILTER],
  "code-coverage": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "cyclomatic-complexity": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "deployment-frequency": [
    InputType.TAGS,
    InputType.WORKLOAD_NAMES,
    InputType.JOB_GROUPS,
    InputType.START_DATE,
    InputType.PIPELINE_STAGE,
  ],
  "lead-time-for-changes": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.JOB_GROUPS, InputType.START_DATE],
  "lines-of-code": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "non-working-pattern": [
    InputType.TAGS,
    InputType.WORKLOAD_NAMES,
    InputType.REPO_GROUPS,
    InputType.START_DATE,
    InputType.SEVERITY_OPTIONS,
  ],
  "pipeline-runs": [
    InputType.TAGS,
    InputType.WORKLOAD_NAMES,
    InputType.JOB_GROUPS,
    InputType.JOB_NAMES,
    InputType.BRANCH_NAMES,
    InputType.START_DATE,
    InputType.PIPELINE_ACTOR_TYPE,
    InputType.PIPELINE_STAGE,
  ],
  "pipeline-success": [
    InputType.TAGS,
    InputType.WORKLOAD_NAMES,
    InputType.JOB_GROUPS,
    InputType.JOB_NAMES,
    InputType.BRANCH_NAMES,
    InputType.START_DATE,
    InputType.PIPELINE_ACTOR_TYPE,
    InputType.PIPELINE_STAGE,
  ],
  "pipeline-durations": [
    InputType.TAGS,
    InputType.WORKLOAD_NAMES,
    InputType.JOB_GROUPS,
    InputType.JOB_NAMES,
    InputType.BRANCH_NAMES,
    InputType.START_DATE,
    InputType.PIPELINE_STAGE,
  ],
  "production-incidents": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.START_DATE, InputType.INCIDENT_FILTER],
  "pr-open-time": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "pr-size": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "prs-per-issue": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "issues-per-pr": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "repo-churn": [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
  "time-to-restore-service": [
    InputType.TAGS,
    InputType.WORKLOAD_NAMES,
    InputType.START_DATE,
    InputType.INCIDENT_FILTER,
  ],
  vulnerabilities: [InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE],
};

/**
 * Get the required input types for a list of query types.
 * Returns unique input types that are required across all provided query types.
 */
export function getInputTypesForQueries(queryTypes: string[]): InputType[] {
  const allInputTypes: InputType[] = [];

  for (const queryType of queryTypes) {
    const inputs = queryInputsMap[queryType];
    if (inputs) {
      allInputTypes.push(...inputs);
    }
  }

  // Remove duplicates
  return Array.from(new Set(allInputTypes));
}
