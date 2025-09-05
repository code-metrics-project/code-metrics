import { createMetricItem, interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { truncateDateOnly } from "../../utils/date";
import { logger } from "../../utils/logger/logger";
import { fetchNewBugsWithArgs, fetchOpenBugsWithArgs, parseTicketArgs } from "../../routes/tickets";
import { LightweightIssue } from "../../model/tickets";
import { getWorkloadById } from "../../config/configMapping";
import { DatedMetrics, DateStamp } from "../../model/metrics";
import { getIncidentMgmtForWorkload } from "../../services/incidentManagement/incidentMgmtService";
import { TimeRangeMode } from "../../services/tickets/ticketService";

export const fetchIncidents = async (args: Record<string, any>): Promise<Map<DateStamp, DatedMetrics>> => {
  const { workloads, startDate, endDate, priority } = parseTicketArgs(args, true);
  logger(`Fetching incidents for workloads: ${workloads}, from: ${startDate}`);

  const ticketPromises = workloads.map(async (workloadId) => {
    const workload = getWorkloadById(workloadId);
    const incidentMgmt = getIncidentMgmtForWorkload(workload);
    return await incidentMgmt.fetchTickets(workloadId, startDate, endDate, priority, TimeRangeMode.CreatedWithinRange);
  });

  const incidents = (await Promise.all(ticketPromises)).flat();
  logger(`Parsing incidents`);
  return groupIssues(incidents, "incidents");
};

/**
 * Bugs newly opened by day.
 * @param workloads
 * @param startDate
 * @param priority
 */
export const fetchNewBugs = async (
  workloads: string[],
  startDate: string,
  priority: string,
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching new bugs for workloads: ${workloads}, at/above: ${priority}, from: ${startDate}`);

  try {
    const bugs = await fetchNewBugsWithArgs({
      workloads,
      startDate,
      priority,
    });

    logger(`Parsing new bugs`);
    const keyPrefix = "all-bugs";
    return groupIssues(bugs, keyPrefix);
  } catch (error) {
    throw new Error(`Failed to fetch new bugs: ${error}`);
  }
};

/**
 * All open bugs by day.
 * @param workloads
 * @param startDate
 * @param priority
 */
export const fetchOpenBugs = async (
  workloads: string[],
  startDate: string,
  priority: string,
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching open bugs for workloads: ${workloads}, at/above: ${priority}, from: ${startDate}`);

  try {
    return await fetchOpenBugsWithArgs({
      workloads,
      startDate,
      priority,
    });
  } catch (error) {
    throw new Error(`Failed to fetch open bugs: ${error}`);
  }
};

/**
 * Group issues by workload/all, then by date.
 * @param issues
 * @param keyPrefix
 */
export const groupIssues = (issues: LightweightIssue[], keyPrefix: string): Map<DateStamp, DatedMetrics> => {
  if (issues.length === 0) {
    return new Map();
  }

  logger(`Processing ${issues.length} issue items`);

  // map of date to workload-grouped issues
  const grouped = new Map<DateStamp, DatedMetrics>();

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];

    const createdDay = truncateDateOnly(issue.created);
    issue.created = createdDay;
    issues[i] = issue;

    const datedEntries: DatedMetrics = grouped.get(createdDay) ?? { [keyPrefix]: [] };

    let metricItem = datedEntries[keyPrefix].find((metric) => metric.dimensions.workloadId === issue.workload);
    if (!metricItem) {
      metricItem = createMetricItem(issue.created, { workloadId: issue.workload });
      datedEntries[keyPrefix].push(metricItem);
    }

    metricItem.value++;
    grouped.set(createdDay, datedEntries);
  }

  return interpolateMissing(grouped, MissingBehaviour.SET_TO_ZERO);
};
