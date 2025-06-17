import { createMetricItem, interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { DatedMetrics, DateStamp, MetricItem, MetricItemDimensions } from "../../model/metrics";
import { logger } from "../../utils/logger/logger";
import { lookupRepoGroupForRepoName } from "../../utils/repos";
import { isMatch } from "lodash";
import { vcsPROpenTimeWithArgs } from "../../services/repos/prs";
import { truncateDateOnly } from "../../utils/date";
import { WorkloadId } from "../../model/config/workload-config";

type PREvent = {
  workloadId: WorkloadId;
  projectName: string;
  repositoryName: string;
  changes: {
    date: string;
    created: Date;
    untilReview: number;
    untilApproval: number;
    untilCompletion: number;
  }[];
};

export const fetchPROpenTime = async (
  workloadIds: string[],
  startDate: string,
  repoGroups: string[],
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching PR open time for workloads: ${workloadIds} from: ${startDate}`);

  try {
    const endDate = truncateDateOnly(new Date());
    const result = await vcsPROpenTimeWithArgs(
      workloadIds,
      repoGroups,
      startDate,
      endDate,
    );

    logger(`Parsing PR open time`);
    return groupPROpenTime(result);
  } catch (error) {
    throw new Error(`Failed to fetch PR open time: ${error}`);
  }
};

const groupPROpenTime = (json: PREvent[]): Map<DateStamp, DatedMetrics> => {
  if (json.length === 0) return new Map();

  const grouped = new Map<DateStamp, DatedMetrics>();
  json.forEach((pr: PREvent) => {
    logger(`${pr.workloadId}/${pr.repositoryName} has ${pr.changes.length} PRs`);

    pr.changes.forEach((change) => {
      const day = change.date as DateStamp;
      const datedMetrics: DatedMetrics = grouped.get(day as DateStamp) ?? { "pr-open-time": [] };

      const repoGroup = lookupRepoGroupForRepoName(pr.workloadId, pr.repositoryName);

      const dimensions: MetricItemDimensions = {
        workloadId: pr.workloadId,
        repoGroup,
        repoName: pr.repositoryName,
        projectName: pr.projectName,
      };

      let metric: MetricItem = datedMetrics["pr-open-time"].find((m) => isMatch(m.dimensions, dimensions));
      if (!metric) {
        metric = createMetricItem(change.date, dimensions);
        datedMetrics["pr-open-time"].push(metric);
      }

      // return duration in seconds
      const newChange = change.untilCompletion / 1000;
      metric.value += newChange;

      grouped.set(day, datedMetrics);
    });
  });

  return interpolateMissing(grouped, MissingBehaviour.NONE);
};
