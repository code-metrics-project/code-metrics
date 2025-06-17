import { createMetricItem, interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { logger } from "../../utils/logger/logger";
import { DatedMetrics, DateStamp, MetricItem, MetricItemDimensions } from "../../model/metrics";
import { codeAnalysisHistoryAsJsonWithArgs } from "../../routes/codeAnalysisHistory";
import { JsonMetricResponse } from "../../services/codeAnalysis/codeAnalysisService";
import { isMatch } from "lodash";

import { WorkloadId } from "../../model/config/workload-config";

type CodeAnalysisEntry = {
  date: string;
  average_complexity: number;
  average_coverage: number;
  total_ncloc: number;
};

type CodeAnalysisHolder = {
  workloadId: WorkloadId;
  repoGroup: string;
  raw: CodeAnalysisEntry[];
};

export const fetchCodeAnalysis = async (
  workloads: string[],
  repoGroups: string[],
  metric: string,
  startDate: string,
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(
    `Fetching ${metric} metric history for workloads: ${workloads} and repo groups: ${repoGroups} from: ${startDate}`,
  );
  try {
    const result = await codeAnalysisHistoryAsJsonWithArgs({
      repoGroups,
      startDate,
      metrics: [metric],
      workloads,
    });

    logger(`Parsing ${metric} metric history`);
    return groupMetrics(result, metric, (m) => {
      switch (metric) {
        case "complexity":
          return m.average_complexity;
        case "coverage":
          return m.average_coverage * 100;
        case "ncloc":
          return m.total_ncloc;
        default:
          throw new Error(`Unsupported metric: ${metric}`);
      }
    });
  } catch (error) {
    throw new Error(`Failed to fetch metric history: ${error}`);
  }
};

/**
 * Group metric data by tag, then by date.
 * @param json
 * @param metricName
 * @param transformFn function to transform the `CodeAnalysisEntry` to a `number`
 */
const groupMetrics = (
  json: JsonMetricResponse[],
  metricName: string,
  transformFn: (m: CodeAnalysisEntry) => number,
): Map<DateStamp, DatedMetrics> => {
  if (json.length === 0) return new Map();

  const codeAnalysisResponse = json as CodeAnalysisHolder[];

  const grouped = new Map<DateStamp, DatedMetrics>();

  for (const tagEntry of codeAnalysisResponse) {
    logger(`${tagEntry.workloadId}/${tagEntry.repoGroup} has ${tagEntry.raw.length} entries`);

    for (const metric of tagEntry.raw) {
      const day = metric.date as DateStamp;
      const datedEntries: DatedMetrics = grouped.get(day) ?? { [metricName]: [] };

      const dimensions: MetricItemDimensions = {
        workloadId: tagEntry.workloadId,
        repoGroup: tagEntry.repoGroup,
      };

      let metricItem: MetricItem = datedEntries[metricName].find((m) => isMatch(m.dimensions, dimensions));
      if (!metricItem) {
        metricItem = createMetricItem(metric.date, dimensions);
        datedEntries[metricName].push(metricItem);
      }

      // note: this will override the value if there are multiple entries for the same date
      metricItem.value = transformFn(metric);

      grouped.set(day, datedEntries);
    }
  }

  return interpolateMissing(grouped, MissingBehaviour.USE_LAST_VALUE);
};
