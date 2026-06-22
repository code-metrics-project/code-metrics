import { TicketManagementTypes } from "../../model/config/common";
import { LightweightIssue } from "../../model/tickets";
import { TicketManagementServer } from "../../model/config/remote-config";
import { Workload, WorkloadId, WorkloadTicketConfig } from "../../model/config/workload-config";
import { ConnectionChecker, ConnectionCheckResult } from "../../model/remote-connection-status";
import { getAllTicketManagementConfig } from "../../config/configMapping";
import { verbose, logger } from "../../utils/logger/logger";

export enum TimeRangeMode {
  CreatedWithinRange,
  ResolvedWithinRange,
}

/**
 * Ticket service used for project management and incident management.
 */
export type TicketService = {
  getTicket(workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null>;

  /**
   * Gets all ticket IDs for the given workload within the specified time range.
   * @param workload
   * @param daysBack
   * @param issueTypes - Optional array of issue types to filter by. If not provided, uses default ticket types.
   */
  getAllTicketIds(workload: Workload, daysBack: number, issueTypes?: string[]): Promise<string[]>;

  /**
   * Gets the available issue types for the given workload.
   * Returns issue types from workload config, server defaults, or default values.
   * @param workloadId - The workload ID
   */
  getAvailableIssueTypes(workloadId: WorkloadId): string[];

  /**
   * Fetches all issues for the given workload that were created within the specified date range.
   * @param workloadId
   * @param startDate
   * @param endDate
   * @param priority
   * @param timeRangeMode
   */
  fetchTickets(
    workloadId: string,
    startDate: Date,
    endDate: Date,
    priority: string | number,
    timeRangeMode: TimeRangeMode,
  ): Promise<LightweightIssue[]>;

  fetchOpenTickets(
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date,
    priority: string | number,
  ): Promise<LightweightIssue[]>;

  matchTicketByIdAndRetrieve(message: string | null, workloadId: WorkloadId): Promise<LightweightIssue | null>;

  matchTicketId(message: string): string | null;

  buildTicketLink(workloadId: WorkloadId, issueId: string): string;
};

/**
 * All access to issue management configuration should go through this interface.
 */
export type TicketConfigManager<C extends WorkloadTicketConfig, I> = {
  getDefaultTicketTypes(): string[];
  getWorkloadConfig(workloadId: WorkloadId): C;
  getServerDefaults(workloadId: WorkloadId): I;
  getServerConfig(serverType: TicketManagementTypes, workloadId: WorkloadId): TicketManagementServer;
};

// Connection checker registry
const checkers: Record<string, ConnectionChecker> = {};

/**
 * Register a connection checker for a Ticket Management provider type.
 * This allows checking connectivity to the remote server.
 */
export const registerTicketConnectionChecker = (type: TicketManagementTypes, checker: ConnectionChecker) => {
  verbose(`Registered ticket management connection checker for: ${type}`);
  checkers[type] = checker;
};

/**
 * Check connectivity to all configured ticket management servers.
 * Returns connection status for each server (excludes 'none' type).
 */
export const checkTicketConnections = async (): Promise<ConnectionCheckResult[]> => {
  const config = getAllTicketManagementConfig();
  const results: ConnectionCheckResult[] = [];

  // Collect all servers from all ticket management types
  const checks: Promise<ConnectionCheckResult>[] = [];
  for (const [providerType, providerConfig] of Object.entries(config)) {
    if (!providerConfig?.servers) continue;
    if (providerType === TicketManagementTypes.NONE) continue; // Skip noop implementations

    const checker = checkers[providerType];
    if (!checker) {
      // No checker registered for this type
      continue;
    }

    for (const server of providerConfig.servers) {
      checks.push(checker(server));
    }
  }

  // Run all checks in parallel
  const settled = await Promise.allSettled(checks);

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      // If a checker itself throws, log the error
      logger(`Ticket management connection check failed with uncaught error: ${result.reason}`);
    }
  }

  return results;
};
