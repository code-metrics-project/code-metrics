import { Request, Response } from "express";
import { getWorkloadById, listWorkloadIds } from "../config/configMapping";
import { ValidationError } from "../utils/validation";
import { LightweightIssue } from "../model/tickets";
import { getIssueMgmtForWorkload } from "../services/projectManangement/issueMgmtService";
import { truncateDateOnly, walkDateRange } from "../utils/date";
import { createMetricItem } from "../utils/metrics";
import { logger } from "../utils/logger/logger";
import { DatedMetrics, DateStamp } from "../model/metrics";
import { TimeRangeMode } from "../services/tickets/ticketService";

export const fetchNewBugsWithArgs = async (args: Record<string, any>): Promise<LightweightIssue[]> => {
  const { workloads, startDate, endDate, priority } = parseTicketArgs(args, false);
  const ticketPromises = workloads.map(async (workloadId) => {
    const workload = getWorkloadById(workloadId);
    const issueMgmt = getIssueMgmtForWorkload(workload);
    return await issueMgmt.fetchTickets(workloadId, startDate, endDate, priority, TimeRangeMode.CreatedWithinRange);
  });
  return (await Promise.all(ticketPromises)).flat();
};

export const fetchOpenBugsWithArgs = async (args: Record<string, any>): Promise<Map<DateStamp, DatedMetrics>> => {
  const { workloads, startDate, endDate, priority } = parseTicketArgs(args, true);
  const openBugs = new Map<DateStamp, DatedMetrics>();

  const ticketPromises = workloads.map(async (workloadId) => {
    const deltas = await getDeltaByDate(workloadId, startDate, endDate, priority);

    let open = 0;
    await walkDateRange(startDate, endDate, async (current) => {
      const currentDateOnly = truncateDateOnly(current);
      const deltaForDate = deltas.get(currentDateOnly) ?? 0;
      open += deltaForDate;
      logger(`${open} open issues for ${workloadId} on ${currentDateOnly}`);

      const metricsForDay: DatedMetrics = openBugs.get(currentDateOnly) ?? { "open-bugs": [] };
      metricsForDay["open-bugs"].push(createMetricItem(current, { workloadId }, open));
      openBugs.set(currentDateOnly, metricsForDay);
    });
  });
  await Promise.all(ticketPromises);
  return openBugs;
};

/**
 * Determine the delta of open tickets by day. A closed ticket counts as `-1` and a newly opened ticket counts as `1`.
 */
const getDeltaByDate = async (
  workloadId: string,
  startDate: Date,
  endDate: Date,
  priority: string,
): Promise<Map<string, number>> => {
  const workload = getWorkloadById(workloadId);
  const issueMgmt = getIssueMgmtForWorkload(workload);
  const issues = await issueMgmt.fetchOpenTickets(workloadId, startDate, endDate, priority);

  const deltaByDate = new Map<string, number>();
  for (const issue of issues) {
    let issueCreated = new Date(issue.created);
    if (issueCreated.getTime() < startDate.getTime()) {
      issueCreated = startDate;
    }
    {
      const createdDate = truncateDateOnly(issueCreated);
      let delta = deltaByDate.get(createdDate) ?? 0;
      delta++;
      deltaByDate.set(createdDate, delta);
    }

    if (issue.resolutiondate) {
      const resolvedDate = truncateDateOnly(new Date(issue.resolutiondate));
      let delta = deltaByDate.get(resolvedDate) ?? 0;
      delta--;
      deltaByDate.set(resolvedDate, delta);
    }
  }
  return deltaByDate;
};

export const parseTicketArgs = (
  args: Record<string, any>,
  defaultEndDateToNow: boolean,
): {
  workloads: string[];
  startDate: Date;
  endDate: Date;
  priority: string;
} => {
  let workloads: string[];
  const workloadsRaw = args?.workloads;
  if (!workloadsRaw) {
    throw new ValidationError("Missing workloads query parameter");
  } else {
    workloads = Array.isArray(workloadsRaw)
      ? workloadsRaw.map((w) => w.toString())
      : (workloadsRaw as string).split(",");
  }
  if (workloads.length === 1 && workloads[0] === "all") {
    workloads = listWorkloadIds();
  }

  // format: yyyy-mm-dd
  const startDate = args?.startDate as string;
  if (!startDate) {
    throw new ValidationError("Missing startDate query parameter");
  }

  return {
    workloads,
    startDate: new Date(startDate),

    // format: yyyy-mm-dd
    endDate: (args?.endDate as string) ? new Date(args?.endDate) : defaultEndDateToNow ? new Date() : null,

    // format: Low | Medium | High | Highest
    priority: (args?.issueFilter?.priority ?? args?.incidentFilter?.priority) as string,
  };
};

// e.g. /api/tickets/bugs?workloads=athena&startDate=2022-03-01&priority=high
export const fetchBugHistory = async (req: Request, res: Response<LightweightIssue[] | string>): Promise<void> => {
  try {
    const issues = await fetchNewBugsWithArgs(req.query);
    if (issues.length) {
      res.json(issues);
    } else {
      res.send([]);
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};
