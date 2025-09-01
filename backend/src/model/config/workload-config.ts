import {
  AzureTicketOptions,
  CodeAnalysisTypes,
  CodeManagementTypes,
  JiraTicketOptions,
  PipelinesTypes,
  ServiceNowTicketOptions,
  TicketManagementTypes,
} from "./common";
import { VersionedConfig } from "./base";

export type WorkloadConfigWrapper = VersionedConfig & {
  workloads: Workload[];
};

export type WorkloadId = string;

export type WorkloadCodeManagementConfig = {
  type: CodeManagementTypes;
  serverId: string;
  projectName: string;
  repoGroups: Record<string, RepoGroup>;
};

export enum JobNameMapping {
  ComponentName = "component-name",
  RepoName = "repo-name",
  None = "none",
}

export type WorkloadPipelineStage = {
  stageId: string;

  /**
   * Outbound mapping of local job names to pipeline job names.
   */
  jobMapping?: Record<string, string>;
};

export type WorkloadPipelinesConfig = {
  /**
   * @deprecated use `stages[*].type`
   */
  type?: PipelinesTypes;

  /**
   * @deprecated use `stages[*].serverId`
   */
  serverId?: string;

  /**
   * @deprecated use `stages[*].projectName`
   */
  projectName?: string;

  jobNameMapping?: JobNameMapping;
  jobGroups?: Record<string, JobGroup>;
  stages: WorkloadPipelineStage[];
};

export type WorkloadCodeAnalysisConfig = {
  type: CodeAnalysisTypes;
  serverId: string;
  branch?: string;

  /**
   * Prepend this string to all component keys passed in Code Analysis queries.
   */
  componentKeyPrefix?: string;

  /**
   * Outbound mapping of local component names to code analysis keys.
   */
  mappings?: RepoCodeAnalysisMapping[];
};

export type BaseWorkloadTicketConfig = {
  type: TicketManagementTypes;
  serverId: string;
};

export type WorkloadTicketConfigAzure = BaseWorkloadTicketConfig &
  AzureTicketOptions & {
    team: string;
    ticketPriorities?: string[];
  };

export type WorkloadTicketConfigJira = BaseWorkloadTicketConfig & JiraTicketOptions;

export type WorkloadTicketConfigServiceNow = BaseWorkloadTicketConfig & ServiceNowTicketOptions;

export type WorkloadTicketConfig =
  | WorkloadTicketConfigAzure
  | WorkloadTicketConfigJira
  | WorkloadTicketConfigServiceNow;

/**
 * Start and end hours/days for a team's working pattern.
 * Range is inclusive at both bounds.
 */
export type TeamWorkingPattern = {
  /**
   * Starting hour (24 hour clock).
   */
  startHour?: number;

  /**
   * End hour (24 hour clock).
   */
  endHour?: number;

  /**
   * Day name or number (0-6, starting on Sunday).
   */
  startDay?: number | string;

  /**
   * Day name or number (0-6, starting on Sunday).
   */
  endDay?: number | string;

  /**
   * The timezone to use for working pattern calculations,
   * e.g. `UTC` or `America/New_York`.
   */
  timezone?: string;
};

export type WorkloadTeamConfig = {
  workingPattern?: Partial<TeamWorkingPattern>;
};

export type Workload = {
  id: WorkloadId;

  /**
   * Friendly name for the workload.
   */
  name?: string;

  team?: WorkloadTeamConfig;

  /**
   * Arbitrary tags for the workload. Can be used
   * for scoping queries and/or grouping output.
   */
  tags?: Record<string, string>;

  codeManagement: WorkloadCodeManagementConfig;
  codeAnalysis: WorkloadCodeAnalysisConfig;
  incidents: WorkloadTicketConfig;
  pipelines: WorkloadPipelinesConfig;
  projectManagement: WorkloadTicketConfig;
};

export type SoftwareComponent = {
  /**
   * The component name. Defaults to the repo name.
   */
  name: string;

  /**
   * Important: this string is actually a regular expression if surrounded by slashes,
   * e.g. `/.*api/`
   */
  repo: string;

  /**
   * This is used to include/exclude a repo from being acted upon.
   */
  exclude?: boolean;

  /**
   * The path(s) within the repository representing this component.
   */
  paths?: string[];
};

export type RepoGroup = {
  components?: SoftwareComponent[];

  /**
   * Literal strings matching sonar tags.
   */
  sonarTags?: string[];
};

export type JobGroup = {
  /**
   * Important: these strings are actually regular expressions
   */
  jobNames?: string[];
};

export type RepoCodeAnalysisMapping = {
  key: string;
  componentName?: string;
  vcsRepoName?: string;
};
