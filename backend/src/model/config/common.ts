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

// export type CodeManagementTypes = keyof CodeManagementConfigWrapper;
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

// export type CodeAnalysisTypes = keyof CodeAnalysisConfigWrapper;
export enum CodeAnalysisTypes {
  NONE = "none",
  SONAR = "sonar",
}

// export type ProjectManagementTypes = keyof ProjectManagementConfigWrapper;
export enum TicketManagementTypes {
  AZURE = "azure",
  JIRA = "jira",
  NONE = "none",
  SERVICENOW = "servicenow",
}

export enum DependencyAlertsTypes {
  NONE = "none",
  GITHUB = "github",
}
