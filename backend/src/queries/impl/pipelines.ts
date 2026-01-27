import { interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { truncateDateOnly } from "../../utils/date";
import { logger, verbose } from "../../utils/logger/logger";
import {
  Branches,
  JobGroups,
  JobNames,
  PipelineQueryOptions,
  PipelineStageInput,
  RollingAverages,
  StartDate,
  Workloads,
} from "../../model/queryInputs";
import { ActorType, RunResult, RunWithMetadata } from "../../model/runs";
import { DatedMetrics, DateStamp, MetricItemDimensions } from "../../model/metrics";
import { getPipelineRunsWithArgs } from "../../routes/pipelines";
import { isMatch } from "lodash";
import { PipelineDurationArgs, PipelineRunArgs, PipelineSuccessArgs } from "../queries";

type PipelineQueryArgs = Workloads &
  JobGroups &
  JobNames &
  Branches &
  StartDate &
  RollingAverages &
  PipelineQueryOptions &
  PipelineStageInput;

enum ValueFormat {
  COUNT = "raw-number",
  PERCENTAGE = "percentage",
}

type DailyPipelineSummary = {
  date: Date;
  aborted: number;
  failed: number;
  successful: number;
  totalDuration: number;
};

type PipelineDatedMetrics = { dimensions: MetricItemDimensions; summary: DailyPipelineSummary };

/**
 * Fetch count of pipeline runs.
 * @param args
 */
export const fetchPipelineRuns = async (args: PipelineRunArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  return fetchPipelineRunsInternal(args, ValueFormat.COUNT);
};

/**
 * Fetch pipeline success rates.
 * @param args
 */
export const fetchPipelineSuccess = async (args: PipelineSuccessArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  return fetchPipelineRunsInternal(args, ValueFormat.PERCENTAGE);
};

const fetchPipelineRunsInternal = async (
  args: PipelineQueryArgs,
  valueFormat: ValueFormat,
): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(
    `Fetching pipeline runs for workloads: ${args.workloads} from: ${args.startDate} with value format: ${valueFormat}`,
  );

  try {
    const result = await getPipelineRunsWithArgs({
      branches: args.branchNames,
      jobGroups: args.jobGroups,
      jobNames: args.jobNames,
      startDate: args.startDate,
      workloads: args.workloads,
      stageId: args.stageId,
    });

    const actorType = args.actorType ?? ActorType.All;
    const filtered = actorFilter(actorType, result);

    logger(`Retrieved ${filtered.length} pipeline runs for workloads: ${args.workloads}`);
    return groupRuns(filtered, valueFormat);
  } catch (error) {
    throw new Error(`Failed to fetch pipeline runs: ${error}`);
  }
};

/**
 * Filter runs by specified ActorType, include all runs that have not defined userType property in result
 * @param filter
 * @param allRuns
 */
const actorFilter = (filter: ActorType, allRuns: RunWithMetadata[]): RunWithMetadata[] => {
  if (filter === ActorType.All) {
    verbose("[actorFilter] ActorType is all - skipping filter");
    return allRuns;
  }
  return allRuns.filter(({ run }) => {
    if (run.userType === filter) {
      verbose(`userType matched (${filter}) - including run: ${run.id}`);
      return true;
    }
    if (!run.userType) {
      verbose(`userType undefined - including run: ${run.id}`);
      return true;
    }
    verbose(`No matching userType - excluding run: ${run.id}`);
    return false;
  });
};

export const fetchPipelineDurations = async (args: PipelineDurationArgs): Promise<Map<DateStamp, DatedMetrics>> => {
  logger(`Fetching pipeline durations for workloads: ${args.workloads} from: ${args.startDate}`);

  try {
    const result = await getPipelineRunsWithArgs({
      branches: args.branchNames,
      jobGroups: args.jobGroups,
      jobNames: args.jobNames,
      startDate: args.startDate,
      workloads: args.workloads,
      stageId: args.stageId,
    });

    logger(`Parsing pipeline durations`);
    return groupDurations(result, args.successfulOnly);
  } catch (error) {
    throw new Error(`Failed to fetch pipeline durations: ${error}`);
  }
};

/**
 * Group runs by workload and status, then by date.
 * @param workloadRuns
 * @param valueFormat
 */
const groupRuns = (workloadRuns: RunWithMetadata[], valueFormat: ValueFormat): Map<DateStamp, DatedMetrics> => {
  logger(`Processing ${workloadRuns.length} pipeline runs`);
  if (workloadRuns.length === 0) {
    return new Map();
  }

  // map of date to workload-grouped runs
  const grouped = new Map<DateStamp, DatedMetrics>();

  summarise(workloadRuns, false).forEach((metrics, date) => {
    const datedMetrics: DatedMetrics =
      valueFormat === ValueFormat.COUNT
        ? { "runs-aborted": [], "runs-failed": [], "runs-successful": [] }
        : { "run-success": [] };

    for (const { dimensions, summary } of metrics) {
      if (valueFormat === ValueFormat.COUNT) {
        datedMetrics["runs-aborted"].push({ dimensions, date: summary.date, value: summary.aborted });
        datedMetrics["runs-failed"].push({ dimensions, date: summary.date, value: summary.failed });
        datedMetrics["runs-successful"].push({ dimensions, date: summary.date, value: summary.successful });
      } else if (valueFormat === ValueFormat.PERCENTAGE) {
        const total = summary.aborted + summary.failed + summary.successful;
        if (total > 0) {
          datedMetrics["run-success"].push({
            dimensions,
            date: summary.date,
            value: (summary.successful / total) * 100,
          });
        }
      } else {
        throw new Error(`Unsupported pipeline value format: ${valueFormat}`);
      }
    }

    grouped.set(date, datedMetrics);
  });

  if (valueFormat === ValueFormat.COUNT) {
    return interpolateMissing(grouped, MissingBehaviour.SET_TO_ZERO);
  } else {
    // no interpolation for percentages
    return grouped;
  }
};

/**
 * Group run durations by workload, then by date.
 * @param workloadRuns
 * @param successfulOnly
 */
const groupDurations = (workloadRuns: RunWithMetadata[], successfulOnly: boolean): Map<DateStamp, DatedMetrics> => {
  logger(`Processing ${workloadRuns.length} pipeline durations`);
  if (workloadRuns.length === 0) {
    return new Map();
  }

  // map of date to workload-grouped durations
  const grouped = new Map<DateStamp, DatedMetrics>();

  summarise(workloadRuns, successfulOnly).forEach((metrics, date) => {
    const datedMetrics: DatedMetrics = { "run-duration": [] };

    for (const { dimensions, summary } of metrics) {
      let meanDuration = 0;
      if (successfulOnly) {
        if (summary.successful > 0) {
          meanDuration = summary.totalDuration / summary.successful;
        }
      } else {
        const total = summary.aborted + summary.failed + summary.successful;
        if (total > 0) {
          meanDuration = summary.totalDuration / total;
        }
      }
      if (meanDuration > 0) {
        datedMetrics["run-duration"].push({ dimensions, date: summary.date, value: meanDuration });
      }
    }

    grouped.set(date, datedMetrics);
  });

  return grouped;
};

const summarise = (
  workloadRuns: RunWithMetadata[],
  totalSuccessfulDurationsOnly = false,
): Map<DateStamp, PipelineDatedMetrics[]> => {
  const outcomes = new Map<DateStamp, PipelineDatedMetrics[]>();

  for (const { jobGroup, run, workloadId } of workloadRuns) {
    // truncate to date only
    const startDay = truncateDateOnly(run.startDate);
    run.startDate = startDay;

    const dimensions: MetricItemDimensions = {
      workloadId,
      jobGroup,
      jobName: run.job,
      repoName: run.repo,
    };

    // group by workload and status, by day.
    const datedEntries: PipelineDatedMetrics[] = outcomes.get(startDay) ?? [];

    let metrics: PipelineDatedMetrics = datedEntries.find((s) => isMatch(s.dimensions, dimensions));

    if (!metrics) {
      metrics = {
        dimensions,
        summary: {
          date: new Date(startDay),
          aborted: 0,
          failed: 0,
          successful: 0,
          totalDuration: 0,
        },
      };
      datedEntries.push(metrics);
    }

    switch (run.result) {
      case RunResult.Aborted:
        metrics.summary.aborted++;
        break;
      case RunResult.Failed:
        metrics.summary.failed++;
        break;
      case RunResult.Succeeded:
        metrics.summary.successful++;
        break;
    }

    if (!totalSuccessfulDurationsOnly || run.result === RunResult.Succeeded) {
      metrics.summary.totalDuration += run.duration;
    }

    outcomes.set(startDay, datedEntries);
  }

  return outcomes;
};

export const testables = {
  groupRuns,
  actorFilter,
};
