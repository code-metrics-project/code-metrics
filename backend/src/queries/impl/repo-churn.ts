import { createMetricItem, interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { logger, warn } from "../../utils/logger/logger";
import { RepoChurn } from "../../model/vcs";
import { isMatch } from "lodash";
import { DatedMetrics, DateStamp, MetricItemDimensions } from "../../model/metrics";
import { vcsRepoChurnWithArgs } from "../../services/repos/churn";
import { truncateDateOnly } from "../../utils/date";

export enum ChangeMeasure {
  /**
   * Added lines and edited lines count positively toward the total.
   * Deleted lines subtract from the total.
   */
  ADD_EDIT_SUBTRACT_DELETE = "add_edit_subtract_delete",

  /**
   * Added, edited and deleted lines all count positively toward the total.
   */
  ADD_EDIT_DELETE_CUMULATIVE = "add_edit_delete_cumulative",

  /**
   * Ignore number of lines change and count only the instances of a change.
   * i.e. an addition of 10 lines counts as one change.
   */
  COUNT = "count",
}

export const fetchRepoChurn = async (
  workloadIds: string[],
  startDate: string,
  changeMeasure: ChangeMeasure,
  repoGroups: string[],
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching repo churn for workloads: ${workloadIds} from: ${startDate}`);

  try {
    const endDate = truncateDateOnly(new Date());
    const result = await vcsRepoChurnWithArgs(
      workloadIds,
      repoGroups,
      startDate,
      endDate,
    );

    if (!changeMeasure) {
      warn(`No change measure specified - defaulting to ${ChangeMeasure.ADD_EDIT_DELETE_CUMULATIVE}`);
      changeMeasure = ChangeMeasure.ADD_EDIT_DELETE_CUMULATIVE;
    }

    logger(`Parsing repo churn`);
    return groupChurn(result, changeMeasure);
  } catch (error) {
    throw new Error(`Failed to fetch repo churn: ${error}`);
  }
};

/**
 * Group issues by `project/repo`, then by date.
 * @param churn
 * @param changeMeasure
 */
const groupChurn = (
  churn: RepoChurn[],
  changeMeasure: ChangeMeasure,
): Map<DateStamp, DatedMetrics> => {
  if (churn.length === 0) return new Map();

  const grouped = new Map<DateStamp, DatedMetrics>();
  churn.forEach((c) => {
    logger(`${c.workloadId}/${c.repoName} has ${c.changes.length} changes`);

    c.changes.forEach((change) => {
      const day = change.date as DateStamp;
      const datedEntries: DatedMetrics = grouped.get(day) ?? { "repo-churn": [] };

      let measureValue: number;
      switch (changeMeasure) {
        case ChangeMeasure.COUNT:
          measureValue = change.value.count;
          break;
        case ChangeMeasure.ADD_EDIT_SUBTRACT_DELETE:
          measureValue = change.value.added + change.value.edited - change.value.deleted;
          break;
        case ChangeMeasure.ADD_EDIT_DELETE_CUMULATIVE:
          measureValue = change.value.added + change.value.edited + change.value.deleted;
          break;
        default:
          throw new Error(`Unsupported change measure: ${changeMeasure}`);
      }

      const dimensions: MetricItemDimensions = {
        workloadId: c.workloadId,
        repoGroup: c.repoGroup,
        repoName: c.repoName,
      };

      let metric = datedEntries["repo-churn"].find((m) => isMatch(m.dimensions, dimensions));
      if (!metric) {
        metric = createMetricItem(change.date, dimensions);
        datedEntries["repo-churn"].push(metric);
      }
      metric.value += measureValue;

      grouped.set(day, datedEntries);
    });
  });

  return interpolateMissing(grouped, MissingBehaviour.SET_TO_ZERO);
};
