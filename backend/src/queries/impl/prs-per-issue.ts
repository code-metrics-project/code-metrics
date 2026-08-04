import { createMetricItem, interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { DatedMetrics, DateStamp, MetricItemDimensions } from "../../model/metrics";
import { logger } from "../../utils/logger/logger";
import { lookupRepoGroupForRepoName } from "../../utils/repos";
import { vcsPRsPerIssueWithArgs } from "../../services/repos/prs";
import { truncateDateOnly } from "../../utils/date";
import { IssueWithPRCount } from "../../model/vcs";

export const fetchPRsPerIssue = async (
  workloads: string[],
  startDate: string,
  repoGroups: string[],
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching PRs-per-issue for workloads: ${workloads} from: ${startDate}`);

  try {
    const endDate = truncateDateOnly(new Date());
    const result = await vcsPRsPerIssueWithArgs(workloads, repoGroups, startDate, endDate);
    return groupPRsPerIssue(result);
  } catch (error) {
    throw new Error(`Failed to fetch PRs-per-issue: ${error}`);
  }
};

const groupPRsPerIssue = (json: IssueWithPRCount[]): Map<DateStamp, DatedMetrics> => {
  if (json.length === 0) return new Map();

  const grouped = new Map<DateStamp, DatedMetrics>();

  json.forEach((issueData) => {
    const intermediate = new Map<
      string,
      { dimensions: MetricItemDimensions; totalPrs: number; issueCount: number; date: DateStamp }
    >();

    issueData.changes.forEach((change) => {
      const day = change.date as DateStamp;
      const repoGroup = lookupRepoGroupForRepoName(issueData.workloadId, issueData.repositoryName);

      const dimensions: MetricItemDimensions = {
        workloadId: issueData.workloadId,
        repoGroup,
        repoName: issueData.repositoryName,
        projectName: issueData.projectName,
      };

      const key = `${day}|${issueData.workloadId}|${repoGroup}|${issueData.repositoryName}`;
      const entry = intermediate.get(key) ?? {
        dimensions,
        totalPrs: 0,
        issueCount: 0,
        date: day,
      };

      entry.totalPrs += change.prCount;
      entry.issueCount += 1;
      intermediate.set(key, entry);
    });

    intermediate.forEach((value) => {
      const datedMetrics: DatedMetrics = grouped.get(value.date) ?? { "prs-per-issue": [] };
      const avg = value.issueCount > 0 ? value.totalPrs / value.issueCount : 0;
      datedMetrics["prs-per-issue"].push(createMetricItem(value.date, value.dimensions, avg));
      grouped.set(value.date, datedMetrics);
    });
  });

  return interpolateMissing(grouped, MissingBehaviour.NONE);
};

export { groupPRsPerIssue };
