import { createMetricItem } from "../../utils/metrics";
import { verbose, warn } from "../../utils/logger/logger";
import { truncateDateOnly } from "../../utils/date";
import { DatedMetrics, DateStamp, MetricItemDimensions } from "../../model/metrics";
import { getDeploymentService } from "../deployment/deploymentService";
import { isMatch } from "lodash";
import { WorkloadId } from "../../model/config/workload-config";

/**
 * Calculate the deployment frequency for a given set of workloads.
 * @param workloads
 * @param stageId
 * @param jobGroups
 * @param startDate
 * @param endDate
 */
export const calculateDeploymentFrequency = async (
  workloads: WorkloadId[],
  stageId: string,
  jobGroups: string[],
  startDate: Date,
  endDate: Date,
): Promise<Map<DateStamp, DatedMetrics>> => {
  verbose(`Calculating deployment frequency for workloads: ${workloads} from: ${startDate}`);

  const deploymentService = getDeploymentService();

  const metrics = new Map<DateStamp, DatedMetrics>();
  for (const workloadId of workloads) {
    const deployments = await deploymentService.fetchDeployments(workloadId, stageId, jobGroups, startDate, endDate);

    for (const [jobGroup, runs] of Object.entries(deployments)) {
      for (const run of runs) {
        try {
          const resolvedDay = truncateDateOnly(run.startDate);

          const datedEntries: DatedMetrics = metrics.get(resolvedDay) ?? { "deployment-frequency": [] };

          const dimensions: MetricItemDimensions = {
            workloadId,
            jobGroup,
          };

          let metric = datedEntries["deployment-frequency"].find((m) => isMatch(m.dimensions, dimensions));
          if (!metric) {
            metric = createMetricItem(resolvedDay, dimensions);
            datedEntries["deployment-frequency"].push(metric);
          }
          metric.value++;

          metrics.set(resolvedDay, datedEntries);
        } catch (e) {
          warn(`Failed to calculate deployment frequency for ${workloadId}-${jobGroup} run ${run.job}: ${e}`);
        }
      }
    }
  }
  return metrics;
}
