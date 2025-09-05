import { ChangeMeasure } from "../queries/impl/repo-churn";
import { ActorType } from "./runs";

export type Branches = {
  branchNames: string[];
};

export type Workloads = {
  workloads: string[];
};

export type RepoGroups = {
  repoGroups: string[];
};

export type JobGroups = {
  jobGroups: string[];
};

export type StartDate = {
  startDate: string;
};

export type IssueFilter = {
  issueFilter?: {
    priority?: string;
  };
};

export type IncidentFilter = {
  incidentFilter?: {
    priority: string;
  };
};

export type RollingAverages = {
  rollingAveragesInDays?: number[];
};

export enum ValueFormat {
  COUNT = "raw-number",
  PERCENTAGE = "percentage",
}

export type PipelineQueryOptions = {
  successfulOnly?: boolean;
  valueFormat?: ValueFormat;
  actorType?: ActorType;
};

export type ChangeMeasureArgs = {
  changeMeasure: ChangeMeasure;
};

export type TagInput = {
  tags: { key: string; value: string }[];
};

export type SeverityOptionsInput = {
  severityOptions: {
    splitBySeverity: boolean;
  };
};

export type PipelineStageInput = {
  stageId: string;
};
