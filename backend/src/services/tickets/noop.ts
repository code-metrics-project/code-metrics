/* eslint-disable @typescript-eslint/no-unused-vars */
import { TicketService, TimeRangeMode } from "./ticketService";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { LightweightIssue } from "../../model/tickets";

/**
 * A no-op implementation of the ticket service.
 */
export class NoOpTicketService implements TicketService {
  buildTicketLink(workloadId: WorkloadId, issueId: string): string {
    return "";
  }

  fetchOpenTickets(
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date,
    priority: string | number,
  ): Promise<LightweightIssue[]> {
    return Promise.resolve([]);
  }

  fetchTickets(
    workloadId: string,
    startDate: Date,
    endDate: Date,
    priority: string | number,
    timeRangeMode: TimeRangeMode,
  ): Promise<LightweightIssue[]> {
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAllTicketIds(workload: Workload, daysBack: number, issueTypes?: string[]): Promise<string[]> {
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAvailableIssueTypes(workloadId: WorkloadId): string[] {
    return [];
  }

  getTicket(workloadId: WorkloadId, issueId: string): Promise<LightweightIssue | null> {
    return Promise.resolve(null);
  }

  matchTicketByIdAndRetrieve(message: string | null, workloadId: WorkloadId): Promise<LightweightIssue | null> {
    return Promise.resolve(null);
  }

  matchTicketId(message: string): string | null {
    return null;
  }
}
