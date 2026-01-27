import { ChangeMeasure } from "../queries/impl/repo-churn";
import { ActorType } from "./runs";
import { Tags } from "./tags";

export type Branches = {
  branchNames: string[];
};

export type Workloads = {
  workloads: string[];
};

export type RepoGroups = {
  repoGroups: string[];
};

export type RepoNames = {
  repoNames: string[];
};

export type JobGroups = {
  jobGroups: string[];
};

export type JobNames = {
  jobNames: string[];
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

export type PipelineQueryOptions = {
  successfulOnly?: boolean;
  actorType?: ActorType;
};

export type ChangeMeasureArgs = {
  changeMeasure: ChangeMeasure;
};

export type TagInput = {
  tags: Tags;
};

export type SeverityOptionsInput = {
  severityOptions: {
    splitBySeverity: boolean;
  };
};

export type PipelineStageInput = {
  stageId: string;
};
