import {
  AzureTicketOptions,
  CodeAnalysisTypes,
  CodeManagementTypes,
  GithubTicketOptions,
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

export type WorkloadTicketConfigGithub = BaseWorkloadTicketConfig & GithubTicketOptions;

export type WorkloadTicketConfigJira = BaseWorkloadTicketConfig & JiraTicketOptions;

export type WorkloadTicketConfigServiceNow = BaseWorkloadTicketConfig & ServiceNowTicketOptions;

export type WorkloadTicketConfig =
  | WorkloadTicketConfigAzure
  | WorkloadTicketConfigGithub
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
  qualityGates?: {
    id: string;
    version: string;
  };
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

export type JobSpec = {
  /**
   * The job/workflow name or pattern. Patterns wrapped in slashes are treated as regular expressions.
   * For GitHub: filters workflows by name within the resolved repo set.
   * Either `name` or `fromRepoGroup` must be specified, but not both (unless `repo` or `componentName` is also set).
   */
  name?: string;

  /**
   * Resolves job name patterns from the repos in the named repo group.
   * For non-GitHub pipelines: each repo's `repo` value is used as a job name pattern.
   * For GitHub pipelines: specifies which repos to fetch workflows from.
   * Mutually exclusive with `repo` and `componentName`.
   */
  fromRepoGroup?: string;

  /**
   * For GitHub pipelines: fetch workflows only from this specific repository.
   * Mutually exclusive with `fromRepoGroup`.
   */
  repo?: string;

  /**
   * For GitHub pipelines: fetch workflows only from the repo whose component name matches this value.
   * Mutually exclusive with `fromRepoGroup`.
   */
  componentName?: string;

  /**
   * If true, jobs matching this spec are excluded from the group.
   */
  exclude?: boolean;
};

export type JobGroup = {
  /**
   * Legacy format: a list of job name patterns (strings).
   * Patterns wrapped in slashes are treated as regular expressions.
   */
  jobNames?: string[];

  /**
   * New format: a list of job specs with optional exclude flag.
   * Both `jobNames` and `jobs` can be used together; they are merged.
   */
  jobs?: JobSpec[];
};

export type RepoCodeAnalysisMapping = {
  key: string;
  componentName?: string;
  vcsRepoName?: string;
};
