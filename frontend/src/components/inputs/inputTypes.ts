/**
 * Input types for dynamic query inputs.
 * This enum is in a separate file to avoid circular dependencies between
 * DynamicInputs.tsx and queryInputs.ts.
 */
export enum InputType {
  BRANCH_NAMES = "branchNames",
  END_DATE = "endDate",
  INCIDENT_FILTER = "incidentFilter",
  ISSUE_FILTER = "issueFilter",
  JOB_GROUPS = "jobGroups",
  JOB_NAMES = "jobNames",
  PIPELINE_ACTOR_TYPE = "actorType",
  PIPELINE_STAGE = "stageId",
  REPO_GROUPS = "repoGroups",
  SEVERITY_OPTIONS = "severityOptions",
  START_DATE = "startDate",
  TAGS = "tags",
  WORKLOAD_NAMES = "workloads",
}
