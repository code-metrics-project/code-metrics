import { isVerbose, logger, verbose } from "../../utils/logger/logger";
import { truncateDateOnly } from "../../utils/date";
import { DailyTotal, getDeploymentService } from "../deployment/deploymentService";
import { DatedMetrics, DateStamp } from "../../model/metrics";
import { WorkloadId } from "../../model/config/workload-config";

/**
 * Calculate the lead time for change for a given set of workloads.
 * @param workloads
 * @param stageId
 * @param jobGroups
 * @param startDate
 * @param endDate
 */
export const calculateLeadTime = async (
  workloads: WorkloadId[],
  stageId: string,
  jobGroups: string[],
  startDate: Date,
  endDate: Date,
): Promise<Map<DateStamp, DatedMetrics>> => {
  verbose(`Calculating lead time for change for workloads: ${workloads} from: ${startDate}`);

  const deploymentService = getDeploymentService();
  const combined = new Map<DateStamp, DatedMetrics>();

  for (const workloadId of workloads) {
    const dailyTotals = await deploymentService.calculateLeadTimes(workloadId, stageId, jobGroups, startDate, endDate);
    const leadTimes = averageByDay(dailyTotals, workloadId);
    logger(`Calculated average lead time for ${workloadId} between ${startDate} and ${endDate}`);

    for (const [date, datedMetrics] of leadTimes) {
      const tagged = combined.get(date) ?? { "lead-time": [] };
      for (const [axisName, metrics] of Object.entries(datedMetrics)) {
        tagged[axisName].push(...metrics);
      }
      combined.set(date, tagged);
    }
  }
  return combined;
};

/**
 * Calculate the average lead time for a workload's job groups, by day.
 * @param dailyTotals
 * @param workloadId
 */
const averageByDay = (
  dailyTotals: Map<Date, Map<string, DailyTotal>>,
  workloadId: string,
): Map<DateStamp, DatedMetrics> => {
  const leadTimes = new Map<DateStamp, DatedMetrics>();

  for (const [date, dailyJobGroup] of dailyTotals) {
    for (const [jobGroup, { total, count }] of dailyJobGroup) {
      if (count === 0) {
        continue;
      }
      const dayOnly = truncateDateOnly(date);
      const average = total / count;

      const datedMetrics = leadTimes.get(dayOnly) ?? { "lead-time": [] };

      const dimensions = {
        workloadId,
        jobGroup,
      };

      datedMetrics["lead-time"].push({ dimensions, date, value: average });

      leadTimes.set(dayOnly, datedMetrics);
    }
  }

  if (isVerbose()) {
    verbose(`Calculated lead times for ${workloadId}`, JSON.stringify(leadTimes, null, 2));
  } else {
    logger(`Calculated lead times for ${workloadId}`);
  }
  return leadTimes;
};
