import { logger, verbose } from "../../utils/logger/logger";
import { sameDay, truncateDateOnly, walkDateRange } from "../../utils/date";
import { getDeploymentService } from "../deployment/deploymentService";
import { getWorkloadById, listJobGroups } from "../../config/configMapping";
import { RunResult } from "../../model/runs";
import { DatedMetrics, DateStamp, MetricItemDimensions } from "../../model/metrics";
import { getIncidentMgmtForWorkload } from "../incidentManagement/incidentMgmtService";
import { TimeRangeMode } from "../tickets/ticketService";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { getIdOfFinalStage } from "../deployment/common";

/**
 * Calculate the change failure rate for a given set of workloads.
 * @param workloads
 * @param stageId
 * @param startDate
 * @param endDate
 * @param priority
 */
export const calculateChangeFailureRate = async (
  workloads: WorkloadId[],
  stageId: string,
  startDate: Date,
  endDate: Date,
  priority: string,
): Promise<Map<DateStamp, DatedMetrics>> => {
  verbose(`Calculating change failure rate for workloads: ${workloads} from: ${startDate}`);

  const metrics = new Map<DateStamp, DatedMetrics>();
  for (const workloadId of workloads) {
    const workload = getWorkloadById(workloadId);
    const deployments = await fetchDeployments(workload, stageId, startDate, endDate);

    const incidentMgt = getIncidentMgmtForWorkload(getWorkloadById(workloadId));
    const incidents = await incidentMgt.fetchTickets(
      workloadId,
      startDate,
      endDate,
      priority,
      TimeRangeMode.CreatedWithinRange,
    );

    await walkDateRange(startDate, endDate, async (day) => {
      const dayDeployments = deployments.filter((run) => {
        return sameDay(run.startDate, day);
      });

      // TODO bucket the issues to a time period after the deployment (but don't overlap with the next deployment or count the same issue twice)
      if (dayDeployments.length === 0) {
        verbose(`No deployments on day: ${day}`);
        return;
      }

      // check if the deployment was successful, irrespective of whether an incident was created
      const failedDeployments = dayDeployments.filter((run) => {
        return run.result === RunResult.Failed;
      });

      // TODO this is a naive implementation, we should check if the deployment was related to the issue
      const dayIncidents = incidents.filter((incident) => {
        return sameDay(incident.created, day);
      });

      const failureRate = Math.min(1, (dayIncidents.length + failedDeployments.length) / dayDeployments.length);

      logger(`On day: ${day}, ${dayIncidents.length} incidents created, ${dayDeployments.length} deployments [${failedDeployments.length} failed]. Calculated daily failure rate: ${failureRate}`);
      const currentDay = truncateDateOnly(day);
      const datedMetrics = metrics.get(currentDay) ?? { "change-failure-rate": [] };

      const dimensions: MetricItemDimensions = {
        workloadId,
      };
      datedMetrics["change-failure-rate"].push({ dimensions, date: day, value: failureRate });
      metrics.set(currentDay, datedMetrics);
    });
  }

  return metrics;
}

const fetchDeployments = async (workload: Workload, stageId: string, startDate: Date, endDate: Date) => {
  const jobGroups = listJobGroups(workload);
  const deploymentService = getDeploymentService();
  const deployments = await deploymentService.fetchDeployments(workload.id, stageId, jobGroups, startDate, endDate);
  return Object.values(deployments).flat();
};
