import { RemoteConfigWrapper } from "./remote-config";
import { WorkloadConfigWrapper } from "./workload-config";
import { StageConfigWrapper } from "./pipeline-config";
import { QualityGatesConfigWrapper } from "./quality-gates-config";

export type AppMetadata = {
  name: string;
  version: string;
};

export type ConfigHolder = {
  metadata: AppMetadata;
  remoteConfigs: RemoteConfigWrapper;
  workloadConfigs: WorkloadConfigWrapper;
  pipelineConfigs: StageConfigWrapper;
  qualityGatesConfigs: QualityGatesConfigWrapper;
};

export type AzureTicketOptions = {
  projectName: string;
  teamFilterQuery?: string;
  ticketTypes: string[];
};

export type GithubTicketOptions = {
  owner: string;
  repo: string;
  ticketTypes: string[];
  ticketPriorities?: string[];
  stateFilter?: "all" | "open" | "closed";
  labelMapping?: Record<string, string>;
};

export type JiraTicketOptions = {
  projectName: string;
  teamFilterQuery?: string;
  ticketTypes: string[];
  ticketPriorities: string[];
};

export type ServiceNowTicketOptions = {
  tableName: string;
  teamFilterQuery?: string;
};

export enum CodeManagementTypes {
  AZURE = "azure",
  BITBUCKET_CLOUD = "bitbucketCloud",
  BITBUCKET_SERVER = "bitbucketServer",
  GITHUB = "github",
  GITLAB = "gitlab",
}

export enum PipelinesTypes {
  AZURE = "azure",
  CODEPIPELINE = "codepipeline",
  DYNATRACE = "dynatrace",
  GITHUB = "github",
  JENKINS = "jenkins",
  NONE = "none",
}

export enum CodeAnalysisTypes {
  NONE = "none",
  SONAR = "sonar",
}

export enum TicketManagementTypes {
  AZURE = "azure",
  GITHUB = "github",
  JIRA = "jira",
  NONE = "none",
  SERVICENOW = "servicenow",
}

export enum DependencyAlertsTypes {
  NONE = "none",
  GITHUB = "github",
}

export enum LlmProviderTypes {
  CLAUDE = "claude",
  GEMINI = "gemini",
}
