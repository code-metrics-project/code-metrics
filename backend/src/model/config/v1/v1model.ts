import { VersionedConfig } from "../base";

import { CodeManagementTypes, TicketManagementTypes } from "../common";
import {
  CodeAnalysisConfigWrapper,
  CodeManagementConfigWrapper,
  PipelinesConfigWrapper,
  TicketManagementServer
} from "../remote-config";
import {
  SoftwareComponent,
  WorkloadCodeAnalysisConfig,
  WorkloadId,
  WorkloadPipelinesConfig,
  WorkloadTeamConfig,
  WorkloadTicketConfig
} from "../workload-config";

export type V1RemoteConfigWrapper = Partial<VersionedConfig> & {
  codeAnalysis: CodeAnalysisConfigWrapper;
  codeManagement: CodeManagementConfigWrapper;
  pipelines?: PipelinesConfigWrapper;

  /**
   * @deprecated Use `ticketManagement` instead.
   */
  projectManagement: ProjectManagementConfigWrapper;
};

export type V1WorkloadConfigWrapper = Partial<VersionedConfig> & {
  workloads: V1Workload[];

  /**
   * @deprecated Use `workload.codeAnalysis.mapping` instead.
   */
  repoMappings?: V1RepoMapping[];
};

export type V1WorkloadDeploymentConfig = {
  deploymentId: string;

  /**
   * Outbound mapping of local job names to pipeline job names.
   */
  jobMapping?: Record<string, string>
};

export type V1Workload = {
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

  codeManagement: V1WorkloadCodeManagementConfig;
  codeAnalysis: WorkloadCodeAnalysisConfig;
  deployment?: V1WorkloadDeploymentConfig;
  pipelines: WorkloadPipelinesConfig;
  projectManagement: WorkloadTicketConfig;
};

export type V1WorkloadCodeManagementConfig = {
  type: CodeManagementTypes;
  serverId: string;
  projectName: string;
  repoGroups: Record<string, V1RepoGroup>;
};

export type V1RepoGroup = {
  /**
   * Important: these strings are actually regular expressions
   *
   * @deprecated use `components` instead
   */
  repoNames?: string[];

  components?: SoftwareComponent[];

  /**
   * Literal strings matching sonar tags.
   */
  sonarTags?: string[];
};

export type JiraFilterOptions = {
  project?: string;
  issueTypes?: string[];
  prodFilterJql?: string;
  teamFilterJql?: string;
};

export type AzureIssueOptions = {
  bugs?: { issueTypes: string[] };
  incidents?: { issueTypes: string[] };
  projectName: string;
};

export type JiraIssueOptions = {
  /**
   * @deprecated Use `bugs.issueTypes` instead.
   */
  bugTypes?: string[];

  /**
   * @deprecated Use `bugs.teamFilterJql` instead.
   */
  teamFilterJql?: string;

  /**
   * @deprecated Use `bugs.prodFilterJql` instead.
   */
  prodFilterJql?: string;

  ticketPriorities: string[];
  project: string;
  bugs?: JiraFilterOptions;
  incidents?: JiraFilterOptions;
};

/**
 * @deprecated Use `TicketConfig` instead.
 */
export type V1IssueConfig = {
  defaults: AzureIssueOptions | JiraIssueOptions;
  servers: TicketManagementServer[];
};

export type V1WorkloadProjectManagementConfig = {
  type: TicketManagementTypes;
  serverId: string;
};

export type V1WorkloadProjectManagementConfigJira =
  V1WorkloadProjectManagementConfig
  & JiraIssueOptions;

export type DeprecatedWorkloadProjectManagementConfigAzure =
  V1WorkloadProjectManagementConfig
  & AzureIssueOptions
  & {
  project: string;
  team: string;
  ticketPriorities?: string[];
};

/**
 * @deprecated Use `RepoCodeAnalysisMapping` instead.
 */
export type V1RepoMapping = {
  sonarProjectKey: string;
  componentName?: string;
  vcsRepoName?: string;
};

/**
 * @deprecated Use `TicketManagementConfigWrapper` instead.
 */
export type ProjectManagementConfigWrapper = {
  azure?: V1IssueConfig;
  jira?: V1IssueConfig;
  servicenow?: V1IssueConfig;
};
