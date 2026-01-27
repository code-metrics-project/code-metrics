import { getOffsetDate, truncateDateOnly } from "@/utils/date";
import { getFirstPipelineStage } from "@/queries/config";

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
  REPO_NAMES = "repoNames",
  SEVERITY_OPTIONS = "severityOptions",
  START_DATE = "startDate",
  TAGS = "tags",
  WORKLOAD_NAMES = "workloads",
}

const defaultInputValues = new Map<InputType, () => any>([
  [InputType.BRANCH_NAMES, () => []],
  [InputType.END_DATE, () => truncateDateOnly(new Date())],
  [InputType.INCIDENT_FILTER, () => ({})],
  [InputType.ISSUE_FILTER, () => ({})],
  [InputType.JOB_GROUPS, () => []],
  [InputType.JOB_NAMES, () => []],
  [InputType.PIPELINE_ACTOR_TYPE, () => ActorType.All],
  [InputType.PIPELINE_STAGE, () => getFirstPipelineStage()],
  [InputType.REPO_GROUPS, () => []],
  [InputType.REPO_NAMES, () => []],
  [
    InputType.SEVERITY_OPTIONS,
    (): SeverityOptionsInput => ({
      splitBySeverity: false,
    }),
  ],
  [InputType.START_DATE, () => truncateDateOnly(getOffsetDate(-30))],
  [InputType.TAGS, () => []],
  [InputType.WORKLOAD_NAMES, () => ["all"]],
]);

export type Workloads = {
  workloads: string[];
};

export type IssueFilterInputs = {
  priority?: string;
};

export enum ActorType {
  All = "All",
  User = "User",
  Bot = "Bot",
  Organization = "Organization",
  App = "App",
}

export type SeverityOptionsInput = {
  splitBySeverity: boolean;
};

/**
 * Get the default value for the given input type.
 * @param inputType
 */
export function getDefaultValue<T>(inputType: InputType): T {
  return defaultInputValues.get(inputType)?.() as T;
}

/**
 * Check if the given value is populated.
 * @param value
 */
export function isPopulatedInputValue(value: any): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
}
