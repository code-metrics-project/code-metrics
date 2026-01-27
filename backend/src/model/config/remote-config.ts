import { AzureTicketOptions, GithubTicketOptions, JiraTicketOptions, ServiceNowTicketOptions } from "./common";
import { VersionedConfig } from "./base";

export type RemoteServerCategory = "codeAnalysis" | "codeManagement" | "pipelines" | "ticketManagement";
export type RemoteServerType =
  | "azure"
  | "bitbucketCloud"
  | "bitbucketServer"
  | "github"
  | "gitlab"
  | "codepipeline"
  | "dynatrace"
  | "jenkins"
  | "none"
  | "jira"
  | "servicenow";

export enum AuthMethod {
  BASIC_AUTH = "BASIC_AUTH",
  BEARER_TOKEN = "BEARER_TOKEN",
  GITHUB_APP = "GITHUB_APP",
  CUSTOM = "CUSTOM",
}

export type RemoteServer = {
  id: string;
  url?: string;
  apiKey?: string;
};

/**
 * Represents OAuth configuration for a remote server.
 */
export type OAuthConfig = {
  clientId?: string;
  clientSecret?: string;

  /**
   * The refresh token to use to obtain an access token. Requires
   * `tokenUrl` to be set.
   */
  refreshToken?: string;

  /**
   * The URL to use to obtain an access token.
   */
  tokenUrl?: string;
};

export type TicketManagementServer = {
  defaults: AzureTicketOptions | GithubTicketOptions | JiraTicketOptions | ServiceNowTicketOptions;
  email?: string;
  authMethod: AuthMethod;

  /**
   * An optional, additional filter to apply to queries to this server.
   */
  filter?: string;

  /**
   * GitHub App configuration (alternative to apiKey for GitHub servers)
   */
  githubApp?: {
    appId: string;
    privateKey: string;
    installationId: string;
  };
} & RemoteServer;

/**
 * Represents a ServiceNow server configuration.
 * ServiceNow optionally supports OAuth2 authentication.
 */
export type ServiceNowServer = TicketManagementServer & OAuthConfig;

export type CodeManagementServer = {
  branches?: string[];
  authMethod?: AuthMethod;

  /**
   * GitHub App configuration (alternative to apiKey for GitHub servers)
   */
  githubApp?: {
    appId: string;
    privateKey: string;
    installationId: string;
  };
} & RemoteServer;

export type BitbucketCodeManagementServer = {
  username?: string;
  authMethod?: AuthMethod;
} & CodeManagementServer;

export type PipelineServer = {
  branches?: string[];
} & RemoteServer;

/**
 * The names of the metric dimensions that map
 * to each pipeline run property.
 */
export type DynatraceDimensionNames = {
  runId: string;
  startDate: string;
  endDate: string;
  outcome: string;
  branch: string;
  repository: string;
  jobName: string;
};

export type DynatraceServer = PipelineServer & {
  metricSelector: string;
  entitySelector?: string;

  /**
   * The value that indicates a successful pipeline run.
   * This is evaluated against the `outcome` dimension.
   */
  successfulOutcomeValue: string;

  /**
   * The names of the metric dimensions that map to each pipeline run property.
   */
  dimensionNames: DynatraceDimensionNames;

  /**
   * If true, the project name will be prefixed to the repository
   * name when querying for pipeline runs, and removed if present
   * in the response.
   */
  prefixProjectName?: boolean;
};

export type SonarServer = {
  /**
   * @see `workload.codeAnalysis.componentKeyPrefix` for workload-specific values
   */
  componentKeyPrefix?: string;
  authMethod?: AuthMethod;
} & RemoteServer;

export type SonarConfig = {
  servers: SonarServer[];
  tagKeyTypes?: string[];
};

export type RemoteConfigWrapper = VersionedConfig & {
  codeAnalysis: CodeAnalysisConfigWrapper;
  codeManagement: CodeManagementConfigWrapper;
  pipelines: PipelinesConfigWrapper;
  ticketManagement: TicketManagementConfigWrapper;
};

export type CodeAnalysisConfigWrapper = {
  sonar?: SonarConfig;
};

export type CodeManagementConfigWrapper = {
  azure?: { servers: CodeManagementServer[] };
  bitbucketCloud?: { servers: BitbucketCodeManagementServer[] };
  bitbucketServer?: { servers: BitbucketCodeManagementServer[] };
  github?: { servers: CodeManagementServer[] };
  gitlab?: { servers: CodeManagementServer[] };
};

export type PipelinesConfigWrapper = {
  azure?: { servers: PipelineServer[] };
  codepipeline?: { servers: PipelineServer[] };
  dynatrace?: { servers: DynatraceServer[] };
  github?: { servers: PipelineServer[] };
  jenkins?: { servers: PipelineServer[] };
  none?: { servers: PipelineServer[] };
};

export type TicketManagementConfigWrapper = {
  azure?: { servers: TicketManagementServer[] };
  github?: { servers: TicketManagementServer[] };
  jira?: { servers: TicketManagementServer[] };
  servicenow?: { servers: ServiceNowServer[] };
};
