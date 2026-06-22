import { RemoteServer } from "./config/remote-config";

/**
 * Status of a connection check to a remote server.
 */
export type ConnectionStatus = "connected" | "unreachable" | "unauthorised" | "error" | "unconfigured" | "rateLimited";

/**
 * Result of checking connectivity to a single remote server.
 */
export type ConnectionCheckResult = {
  /** Unique server ID from config */
  id: string;

  /** Config category (codeAnalysis, codeManagement, pipelines, ticketManagement, llm) */
  category: string;

  /** Provider type (github, azure, jira, sonar, etc.) */
  type: string;

  /** Server URL if configured */
  url?: string;

  /** Connection status */
  status: ConnectionStatus;

  /** Human-readable status detail (error message, HTTP status, etc.) */
  statusDetail?: string;

  /** Time taken to perform the check in milliseconds */
  responseTimeMs?: number;
};

/**
 * Response from the remote connections check endpoint.
 */
export type RemoteConnectionsResponse = {
  /** Array of connection check results */
  results: ConnectionCheckResult[];

  /** ISO timestamp of when the checks were performed */
  checkedAt: string;
};

/**
 * Function type for checking connection to a specific remote server.
 */
export type ConnectionChecker = (server: RemoteServer) => Promise<ConnectionCheckResult>;
