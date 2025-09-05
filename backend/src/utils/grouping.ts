import { GroupBy, RawQuery } from "../model/query";
import { DatedMetrics, DateStamp, IntermediaryDatedMetrics, MetricEntry, MetricItem } from "../model/metrics";
import { verbose, warn } from "./logger/logger";
import { getQueryByAxis, ReduceStrategy } from "../queries/config";
import { getWorkloadById } from "../config/configMapping";

export const groupBy = async (
  query: RawQuery,
  dataset: Map<DateStamp, DatedMetrics>,
): Promise<Map<string, IntermediaryDatedMetrics>> => {
  const dimensionName = query.groupBy ?? "workloadId";
  verbose(`Grouping ${query.queryName} metrics by ${dimensionName}`);

  const daily = new Map<DateStamp, Map<string, number[]>>();

  for (const [day, datedMetrics] of dataset) {
    for (const [axisName, metrics] of Object.entries(datedMetrics)) {
      for (const metric of metrics) {
        try {
          const dayEntries = groupByDimension(daily, day, dimensionName, metric, axisName);
          daily.set(day, dayEntries);
        } catch (e) {
          throw new Error(
            `Error grouping ${query.queryName} metric ${JSON.stringify(metric)} by ${dimensionName}: ${e}`,
          );
        }
      }
    }
  }

  return reduceToSingle(daily);
};

const groupByDimension = (
  allEntries: Map<DateStamp, Map<string, number[]>>,
  day: DateStamp,
  dimensionName: GroupBy,
  metric: MetricItem,
  axisName: string,
): Map<string, number[]> => {
  const workload = getWorkloadById(metric.dimensions.workloadId);
  if (!workload) {
    warn(`Unable to find workload with ID: ${metric.dimensions.workloadId} when grouping by ${dimensionName}`);
  }
  const dimensions = {
    ...(workload?.tags ?? {}),
    ...metric.dimensions,
  };

  let dimensionValue: string;
  if (dimensionName === "repoGroup") {
    // in the case of repoGroup, prefix workloadId to avoid collisions
    dimensionValue = dimensions.workloadId + "-" + dimensions.repoGroup;
  } else if (dimensionName === "jobGroup") {
    // in the case of jobGroup, prefix workloadId to avoid collisions
    dimensionValue = dimensions.workloadId + "-" + dimensions.jobGroup;
  } else {
    dimensionValue = dimensions[dimensionName];
  }

  const dayEntries = allEntries.get(day) ?? new Map<string, number[]>();

  // this looks something like "coverage/athena-frontend" (workload and repo group)
  // or "coverage/account-pod" (a tag name)
  const metricKey = axisName + "/" + dimensionValue;

  const entry = dayEntries.get(metricKey) ?? [];
  entry.push(metric.value);
  dayEntries.set(metricKey, entry);

  return dayEntries;
};

/**
 * Reduce the grouped metrics to a single value per day.
 * @param daily
 */
function reduceToSingle(daily: Map<DateStamp, Map<string, number[]>>): Map<string, IntermediaryDatedMetrics> {
  const output = new Map<string, IntermediaryDatedMetrics>();

  for (const [day, entries] of daily) {
    for (const [tag, values] of entries) {
      const axisName = tag.split("/")[0];
      const reduce = getQueryByAxis(axisName).reduce;
      verbose(`Reducing ${axisName} axis using ${reduce}`);

      const existing = output.get(day) ?? { entries: new Map<string, MetricEntry>() };
      const valueSum = values.reduce((acc, v) => acc + v, 0);

      let singleValue: number;
      switch (reduce) {
        case ReduceStrategy.SUM:
          singleValue = valueSum;
          break;
        case ReduceStrategy.AVERAGE:
          singleValue = valueSum / values.length;
          break;
        default:
          throw new Error(`Unknown reduce behaviour for axis ${axisName}: ${reduce}`);
      }

      existing.entries.set(tag, { date: day, value: singleValue });
      output.set(day, existing);
    }
  }

  return output;
}
