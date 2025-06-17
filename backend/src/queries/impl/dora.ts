import {
  ChangeFailureRateArgs,
  DeploymentFrequencyArgs,
  LeadTimeForChangesArgs,
  TimeToRestoreServiceArgs
} from "../queries";
import { averageMultipleDailyEntriesByDay } from "../../utils/metrics";
import { logger } from "../../utils/logger/logger";
import { todayDateOnly } from "../../utils/date";
import { listJobGroups, listWorkloadIds } from "../../config/configMapping";
import { calculateDeploymentFrequency } from "../../services/dora/deploymentFrequency";
import { calculateLeadTime } from "../../services/dora/leadTime";
import { calculateChangeFailureRate } from "../../services/dora/changeFailureRate";
import { calculateTimeToRestore } from "../../services/dora/timeToRestore";
import { DatedMetrics, DateStamp } from "../../model/metrics";
import { getIdOfFinalStage } from "../../services/deployment/common";

export const fetchChangeFailureRate = async (args: ChangeFailureRateArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching change failure rate for workloads: ${args.workloads} from: ${args.startDate}`);
  try {
    const endDate = todayDateOnly();
    const workloads = args.workloads?.length === 1 && args.workloads[0] === "all" ? listWorkloadIds() : args.workloads;
    if (0 === workloads.length) {
      return new Map();
    }

    // TODO take this from query parameters
    const stageId = getIdOfFinalStage(workloads[0]);

    return await calculateChangeFailureRate(
      workloads,
      stageId,
      new Date(args.startDate),
      endDate,
      args.incidentFilter.priority,
    );
  } catch (error) {
    throw new Error(`Failed to fetch change failure rate for workloads: ${args.workloads}: ${error}`);
  }
};

export const fetchDeploymentFrequency = async (args: DeploymentFrequencyArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching deployment frequency for workloads: ${args.workloads} from: ${args.startDate}`);
  const endDate = todayDateOnly();
  const workloads = args.workloads?.length === 1 && args.workloads[0] === "all" ? listWorkloadIds() : args.workloads;
  const jobGroups = args.jobGroups?.length ? args.jobGroups : listJobGroups();

  if (0 === workloads.length) {
    return new Map();
  }

  try {
    return await calculateDeploymentFrequency(
      workloads,
      args.stageId,
      jobGroups,
      new Date(args.startDate),
      endDate,
    );
  } catch (error) {
    throw new Error(`Failed to fetch deployment frequency for workloads: ${args.workloads}: ${error}`);
  }
};

export const fetchLeadTimeForChanges = async (args: LeadTimeForChangesArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching lead time for changes for workloads: ${args.workloads} from: ${args.startDate}`);
  const endDate = todayDateOnly();
  const workloads = args.workloads?.length === 1 && args.workloads[0] === "all" ? listWorkloadIds() : args.workloads;
  const jobGroups = args.jobGroups?.length ? args.jobGroups : listJobGroups();

  if (0 === workloads.length) {
    return new Map();
  }

  // TODO take this from query parameters
  const stageId = getIdOfFinalStage(workloads[0]);

  try {
    return await calculateLeadTime(
      workloads,
      stageId,
      jobGroups,
      new Date(args.startDate),
      endDate,
    );
  } catch (error) {
    throw new Error(`Failed to fetch lead time for changes for workloads: ${args.workloads}: ${error}`);
  }
};

export const fetchTimeToRestoreService = async (args: TimeToRestoreServiceArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching time to restore service for workloads: ${args.workloads} from: ${args.startDate}`);
  const endDate = todayDateOnly();
  const workloads = args.workloads?.length === 1 && args.workloads[0] === "all" ? listWorkloadIds() : args.workloads;
  try {
    const metrics = await calculateTimeToRestore(
      workloads,
      new Date(args.startDate),
      endDate,
      args.incidentFilter.priority,
    );
    return averageMultipleDailyEntriesByDay(metrics);
  } catch (error) {
    throw new Error(`Failed to fetch time to restore service for workloads: ${args.workloads}: ${error}`);
  }
};
