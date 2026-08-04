import { createMetricItem, interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { DatedMetrics, DateStamp, MetricItemDimensions } from "../../model/metrics";
import { logger } from "../../utils/logger/logger";
import { lookupRepoGroupForRepoName } from "../../utils/repos";
import { vcsIssuesPerPRWithArgs } from "../../services/repos/prs";
import { truncateDateOnly } from "../../utils/date";
import { PRWithIssueCount } from "../../model/vcs";

export const fetchIssuesPerPR = async (
  workloads: string[],
  startDate: string,
  repoGroups: string[],
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching Issues-per-PR for workloads: ${workloads} from: ${startDate}`);

  try {
    const endDate = truncateDateOnly(new Date());
    const result = await vcsIssuesPerPRWithArgs(workloads, repoGroups, startDate, endDate);
    return groupIssuesPerPR(result);
  } catch (error) {
    throw new Error(`Failed to fetch Issues-per-PR: ${error}`);
  }
};

const groupIssuesPerPR = (json: PRWithIssueCount[]): Map<DateStamp, DatedMetrics> => {
  if (json.length === 0) return new Map();

  const grouped = new Map<DateStamp, DatedMetrics>();

  json.forEach((repoData) => {
    const intermediate = new Map<
      string,
      { dimensions: MetricItemDimensions; totalIssues: number; prCount: number; date: DateStamp }
    >();

    repoData.changes.forEach((change) => {
      const day = change.date as DateStamp;
      const repoGroup = lookupRepoGroupForRepoName(repoData.workloadId, repoData.repositoryName);

      const dimensions: MetricItemDimensions = {
        workloadId: repoData.workloadId,
        repoGroup,
        repoName: repoData.repositoryName,
        projectName: repoData.projectName,
      };

      const key = `${day}|${repoData.workloadId}|${repoGroup}|${repoData.repositoryName}`;
      const entry = intermediate.get(key) ?? {
        dimensions,
        totalIssues: 0,
        prCount: 0,
        date: day,
      };

      entry.totalIssues += change.issueCount;
      entry.prCount += 1;
      intermediate.set(key, entry);
    });

    intermediate.forEach((value) => {
      const datedMetrics: DatedMetrics = grouped.get(value.date) ?? { "issues-per-pr": [] };
      const avg = value.prCount > 0 ? value.totalIssues / value.prCount : 0;
      datedMetrics["issues-per-pr"].push(createMetricItem(value.date, value.dimensions, avg));
      grouped.set(value.date, datedMetrics);
    });
  });

  return interpolateMissing(grouped, MissingBehaviour.NONE);
};

export { groupIssuesPerPR };
