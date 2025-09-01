import { DatedMetrics, DateStamp, MetricItem, MetricItemDimensions } from "../../model/metrics";
import { todayDateOnly, truncateDateOnly } from "../../utils/date";
import { listRepoGroups, listWorkloadIds } from "../../config/configMapping";
import { lookupRepoGroupForRepoName } from "../../utils/repos";
import { ChangeCategory, EnrichedRepoChange } from "../../model/vcs";
import { logger, verbose } from "../../utils/logger/logger";
import { WorkloadId } from "../../model/config/workload-config";
import { ChangeTypeArgs } from "../queries";
import { fetchRepoChanges } from "../../services/repos/changes";

type ChangeItem = {
  workloadId: WorkloadId;
  repoName: string;
  commitHash: string;
  date: Date;
  category: ChangeCategory;
};

export const fetchChangeCategories = async (args: ChangeTypeArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(
    `Fetching change categories for workloads: ${args.workloads} and repo groups: ${args.repoGroups} from: ${args.startDate}`,
  );
  try {
    const endDate = todayDateOnly();
    const workloads = args.workloads?.length === 1 && args.workloads[0] === "all" ? listWorkloadIds() : args.workloads;
    const repoGroups = args.repoGroups?.length ? args.repoGroups : listRepoGroups();

    return await listCatagorisedChanges(workloads, repoGroups, new Date(args.startDate), endDate);
  } catch (error) {
    throw new Error(
      `Failed to fetch change categories for workloads: ${args.workloads} and repo groups: ${args.repoGroups}: ${error}`,
    );
  }
};

const listCatagorisedChanges = async (
  workloads: WorkloadId[],
  repoGroups: string[],
  startDate: Date,
  endDate: Date,
): Promise<Map<DateStamp, DatedMetrics>> => {
  // fetch enriched changes with links populated
  const changes = (await fetchRepoChanges(workloads, repoGroups, startDate, endDate, true)) as EnrichedRepoChange[];

  const categorisedChanges = inferCategory(changes);

  const metrics = new Map<DateStamp, DatedMetrics>();
  for (const change of categorisedChanges) {
    const day = truncateDateOnly(change.date);
    const dailyMetrics = metrics.get(day) ?? {};

    const repoGroup = lookupRepoGroupForRepoName(change.workloadId, change.repoName);
    const dimensions: MetricItemDimensions = {
      workloadId: change.workloadId,
      repoName: change.repoName,
      repoGroup,
    };

    const axisName = `change-category-${change.category.toLowerCase()}`;
    let axis: MetricItem[] = dailyMetrics[axisName];
    if (!axis) {
      axis = [];
      dailyMetrics[axisName] = axis;
    }

    axis.push({
      dimensions,
      date: change.date,
      value: 1,
    });
    metrics.set(day, dailyMetrics);
  }

  return metrics;
};

const categoriseChange = (change: EnrichedRepoChange): ChangeCategory => {
  let category: ChangeCategory;
  if (change.links.issueId) {
    category = "ticketed";
  } else {
    const prLink = change.links.prLink;
    if (prLink) {
      category = "pr";
    } else {
      category = "commit";
    }
  }
  verbose(`Categorised change ${change.commitId} as ${category}`);
  return category;
};

const inferCategory = (changes: EnrichedRepoChange[]): ChangeItem[] => {
  logger(`Categorising ${changes.length} changes`);

  const categorised = changes.map((change) => {
    const changeItem: ChangeItem = {
      workloadId: change.workload,
      repoName: change.repo,
      commitHash: change.commitId,
      date: new Date(change.date),
      category: categoriseChange(change),
    };
    return changeItem;
  });

  verbose(`${categorised.length} changes categorised`);
  return categorised;
};
