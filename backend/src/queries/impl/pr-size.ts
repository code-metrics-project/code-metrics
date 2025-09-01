import { createMetricItem, interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { DatedMetrics, DateStamp, MetricItem, MetricItemDimensions } from "../../model/metrics";
import { logger } from "../../utils/logger/logger";
import { vcsPRSizeWithArgs } from "../../services/repos/prs";
import { PREventDetail } from "../../model/vcs";
import { lookupRepoGroupForRepoName } from "../../utils/repos";
import { isMatch } from "lodash";
import { truncateDateOnly } from "../../utils/date";

export const fetchPRSize = async (
  workloads: string[],
  startDate: string,
  repoGroups: string[],
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching PR size for workloads: ${workloads} from: ${startDate}`);

  try {
    const endDate = truncateDateOnly(new Date());
    const result = await vcsPRSizeWithArgs(workloads, repoGroups, startDate, endDate);

    logger(`Parsing PR size`);
    return groupPRSize(result);
  } catch (error) {
    throw new Error(`Failed to fetch PR size: ${error}`);
  }
};

const groupPRSize = (json: PREventDetail[]): Map<DateStamp, DatedMetrics> => {
  if (json.length === 0) return new Map();

  const grouped = new Map<DateStamp, DatedMetrics>();

  json.forEach((pr: PREventDetail) => {
    logger(`${pr.workloadId}/${pr.repositoryName} has ${pr.changes.length} PRs`);

    const prSizes = pr.changes.map((change) => ({
      date: change.date,
      size: change.additions + change.changedFiles + change.commits + change.deletions,
    }));

    const prSizesByDate = prSizes.reduce((acc, change) => {
      const existingMetricForDate = acc.find((a) => a.date === change.date);

      if (!existingMetricForDate) {
        acc.push({ date: change.date, size: change.size, count: 1 });
        return acc;
      }

      existingMetricForDate.count += 1;
      existingMetricForDate.size += change.size;

      return acc;
    }, []);

    const averagedPRSizesByDate = prSizesByDate.map((change) => ({
      date: change.date,
      value: change.size / change.count,
    }));

    averagedPRSizesByDate.forEach((change) => {
      const day = change.date as DateStamp;
      const datedMetrics: DatedMetrics = grouped.get(day as DateStamp) ?? { "pr-size": [] };

      const repoGroup = lookupRepoGroupForRepoName(pr.workloadId, pr.repositoryName);

      const dimensions: MetricItemDimensions = {
        workloadId: pr.workloadId,
        repoGroup,
        repoName: pr.repositoryName,
        projectName: pr.projectName,
      };

      let metric: MetricItem = datedMetrics["pr-size"].find((m) => isMatch(m.dimensions, dimensions));
      if (!metric) {
        metric = createMetricItem(change.date, dimensions);
        datedMetrics["pr-size"].push(metric);
      }

      metric.value += change.value;

      grouped.set(day, datedMetrics);
    });
  });

  return interpolateMissing(grouped, MissingBehaviour.NONE);
};
