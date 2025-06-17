import { createMetricItem } from "../../utils/metrics";
import { getWorkloadById } from "../../config/configMapping";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { dateDiff, truncateDateOnly } from "../../utils/date";
import { DatedMetrics, DateStamp } from "../../model/metrics";
import { getIncidentMgmtForWorkload } from "../incidentManagement/incidentMgmtService";
import { TimeRangeMode } from "../tickets/ticketService";
import { WorkloadId } from "../../model/config/workload-config";

/**
 * Calculate the time to restore service for a given set of workloads.
 * Each day may have zero or more entries, corresponding to the time to restore for each resolved incident.
 * @param workloads
 * @param startDate
 * @param endDate
 * @param priority
 */
export const calculateTimeToRestore = async (
  workloads: WorkloadId[],
  startDate: Date,
  endDate: Date,
  priority: string,
): Promise<Map<DateStamp, DatedMetrics>> => {
  verbose(`Calculating time to restore service for workloads: ${workloads} from: ${startDate}`);

  const metrics = new Map<DateStamp, DatedMetrics>();
  for (const workloadId of workloads) {
    const incidentMgt = getIncidentMgmtForWorkload(getWorkloadById(workloadId));
    const issues = await incidentMgt.fetchTickets(
      workloadId,
      startDate,
      endDate,
      priority,
      TimeRangeMode.ResolvedWithinRange,
    );

    const resolvedIssues = issues.filter((issue) => issue.resolutiondate);
    logger(`Found ${resolvedIssues.length} resolved incidents for workload: ${workloadId}`);

    for (const issue of resolvedIssues) {
      try {
        const resolvedDay = truncateDateOnly(issue.resolutiondate);

        // duration in seconds
        const openDuration = dateDiff(issue.created, issue.resolutiondate) / 1000;

        const datedEntries: DatedMetrics = metrics.get(resolvedDay) ?? { "time-to-restore": [] };

        const dimensions = {
          workloadId,
        };

        const metric = createMetricItem(issue.resolutiondate, dimensions);
        metric.value = openDuration;
        datedEntries["time-to-restore"].push(metric);

        metrics.set(resolvedDay, datedEntries);

      } catch (e) {
        warn(`Failed to calculate duration for issue: ${issue.key} for workload: ${workloadId}: ${e}`);
      }
    }
  }
  return metrics;
}
