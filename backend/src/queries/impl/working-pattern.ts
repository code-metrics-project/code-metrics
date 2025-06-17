import { NonWorkingPatternArgs } from "../queries";
import { logger } from "../../utils/logger/logger";
import { todayDateOnly } from "../../utils/date";
import { listRepoGroups, listWorkloadIds } from "../../config/configMapping";
import { DatedMetrics, DateStamp } from "../../model/metrics";
import { listNonWorkingPatternChanges } from "../../services/working-pattern/working-pattern";

export const fetchNonWorkingPatternChanges = async (args: NonWorkingPatternArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching non-working pattern changes for workloads: ${args.workloads} and repo groups: ${args.repoGroups} from: ${args.startDate}`);
  try {
    const endDate = todayDateOnly();
    const workloads = args.workloads?.length === 1 && args.workloads[0] === "all" ? listWorkloadIds() : args.workloads;
    const repoGroups = args.repoGroups?.length ? args.repoGroups : listRepoGroups();
    const splitBySeverity = args.severityOptions?.splitBySeverity ?? false;

    return await listNonWorkingPatternChanges(
      workloads,
      repoGroups,
      new Date(args.startDate),
      endDate,
      splitBySeverity,
    );
  } catch (error) {
    throw new Error(`Failed to fetch non-working pattern changes for workloads: ${args.workloads} and repo groups: ${args.repoGroups}: ${error}`);
  }
};
