import { DatedMetrics, DateStamp, MetricItem, MetricItemDimensions } from "../../model/metrics";
import { fetchRepoChanges } from "../repos/changes";
import { truncateDateOnly } from "../../utils/date";
import { getWorkloadById } from "../../config/configMapping";
import { lookupRepoGroupForRepoName } from "../../utils/repos";
import { RepoChange } from "../../model/vcs";
import { interpolateMissing, MissingBehaviour } from "../../utils/metrics";
import { verbose } from "../../utils/logger/logger";
import { fromZonedTime } from "date-fns-tz";
import { TeamWorkingPattern, Workload, WorkloadId } from "../../model/config/workload-config";

/**
 * Reflects the order of Date.getDay() values.
 */
const DAY_INDEX = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const DEFAULT_WORKING_PATTERN: TeamWorkingPattern = {
  startHour: 9,
  endHour: 17,
  startDay: "Monday",
  endDay: "Friday",
  timezone: "UTC",
};

export enum NonWorkingSeverity {
  High,
  Medium,
  Low,
}

type NonWorkingChange = {
  workloadId: WorkloadId;
  repoName: string;
  commitHash: string;
  date: Date;
  severity: NonWorkingSeverity;
};

export const listNonWorkingPatternChanges = async (
  workloads: WorkloadId[],
  repoGroups: string[],
  startDate: Date,
  endDate: Date,
  splitBySeverity: boolean,
): Promise<Map<DateStamp, DatedMetrics>> => {
  const changes = await fetchRepoChanges(
    workloads,
    repoGroups,
    startDate,
    endDate,
    false,
  );

  const outsideWorkingPattern = extractNonWorkingChanges(changes);

  const metrics = new Map<DateStamp, DatedMetrics>();
  for (const change of outsideWorkingPattern) {
    const day = truncateDateOnly(change.date);
    const dailyMetrics = metrics.get(day) ?? (splitBySeverity ? {
      "non-working-high": [],
      "non-working-medium": [],
      "non-working-low": [],
    } : {
      "non-working": [],
    });

    const repoGroup = lookupRepoGroupForRepoName(change.workloadId, change.repoName);
    const dimensions: MetricItemDimensions = {
      workloadId: change.workloadId,
      repoName: change.repoName,
      repoGroup,
    };

    let axis: MetricItem[];
    if (splitBySeverity) {
      switch (change.severity) {
        case NonWorkingSeverity.High:
          axis = dailyMetrics["non-working-high"];
          break;
        case NonWorkingSeverity.Medium:
          axis = dailyMetrics["non-working-medium"];
          break;
        case NonWorkingSeverity.Low:
          axis = dailyMetrics["non-working-low"];
          break;
      }
    } else {
      axis = dailyMetrics["non-working"];
    }

    axis.push({
      dimensions,
      date: change.date,
      value: 1,
    });
    metrics.set(day, dailyMetrics);
  }

  return interpolateMissing(metrics, MissingBehaviour.SET_TO_ZERO);
}

/**
 * Get the working pattern for a workload. All hours are converted to UTC.
 * @param workload
 */
const getWorkingPatternForWorkload = (workload: Workload): TeamWorkingPattern => {
  const pattern: TeamWorkingPattern = {
    startHour: workload.team?.workingPattern?.startHour ?? DEFAULT_WORKING_PATTERN.startHour,
    endHour: workload.team?.workingPattern?.endHour ?? DEFAULT_WORKING_PATTERN.endHour,
    startDay: workload.team?.workingPattern?.startDay ?? DEFAULT_WORKING_PATTERN.startDay,
    endDay: workload.team?.workingPattern?.endDay ?? DEFAULT_WORKING_PATTERN.endDay,
    timezone: workload.team?.workingPattern?.timezone ?? DEFAULT_WORKING_PATTERN.timezone,
  };
  if (typeof pattern.startDay === "string") {
    pattern.startDay = DAY_INDEX.indexOf(pattern.startDay.toLowerCase());
  }
  if (typeof pattern.endDay === "string") {
    pattern.endDay = DAY_INDEX.indexOf(pattern.endDay.toLowerCase());
  }
  return toUTC(pattern);
};

/**
 * Convert the working pattern to UTC.
 * @param pattern
 */
const toUTC = (pattern: TeamWorkingPattern): TeamWorkingPattern => {
  const startDate = fromLocalTimeToUTC(pattern.startDay as number, pattern.startHour, pattern.timezone);
  const endDate = fromLocalTimeToUTC(pattern.endDay as number, pattern.endHour, pattern.timezone);

  const newPattern: TeamWorkingPattern = {
    startHour: startDate.getUTCHours(),
    endHour: endDate.getUTCHours(),
    startDay: startDate.getUTCDay(),
    endDay: endDate.getUTCDay(),
    timezone: "UTC",
  };
  return newPattern;
};

const fromLocalTimeToUTC = (
  dayIndex: number,
  hour: number,
  timezone: string,
): Date => {
  // dayIndex is 0-6, starting on Sunday
  // 2001 is a non-leap year
  // 8 January 2001 (2001, 0, 7) is a Monday
  const date = new Date(2001, 0, dayIndex + 7, hour);
  return fromZonedTime(date, timezone);
}

const categoriseSeverity = (
  changeDateTime: Date, pattern: TeamWorkingPattern
): NonWorkingSeverity => {
  if (changeDateTime.getUTCDay() + 7 < (pattern.startDay as number + 7)
    || changeDateTime.getUTCDay() + 7 > (pattern.endDay as number + 7)) {

    return NonWorkingSeverity.High;

  } else {
    let hours: number;
    if (changeDateTime.getUTCHours() < pattern.startHour) {
      hours = pattern.startHour - changeDateTime.getUTCHours();
    } else if (changeDateTime.getUTCHours() > pattern.endHour) {
      hours = changeDateTime.getUTCHours() - pattern.endHour;
    } else {
      hours = 0;
    }

    if (hours <= 1) {
      return NonWorkingSeverity.Low;
    } else if (hours <= 3) {
      return NonWorkingSeverity.Medium;
    } else {
      return NonWorkingSeverity.High;
    }
  }
};

const extractNonWorkingChanges = (changes: RepoChange[]): NonWorkingChange[] => {
  const outsideWorkingPattern = changes.filter((change) => {
    const workload = getWorkloadById(change.workload);
    const changeDateTime = new Date(change.date);
    const pattern = getWorkingPatternForWorkload(workload);

    return changeDateTime.getUTCHours() < pattern.startHour
      || changeDateTime.getUTCHours() > pattern.endHour
      || (changeDateTime.getUTCDay() + 7) < (pattern.startDay as number + 7)
      || (changeDateTime.getUTCDay() + 7) > (pattern.endDay as number + 7);

  }).map((change) => {
    const workload = getWorkloadById(change.workload);
    const changeDateTime = new Date(change.date);
    const pattern = getWorkingPatternForWorkload(workload);
    const severity = categoriseSeverity(changeDateTime, pattern);

    const nwChange: NonWorkingChange = {
      workloadId: change.workload,
      repoName: change.repo,
      commitHash: change.commitId,
      date: new Date(change.date),
      severity,
    };
    return nwChange;
  });

  verbose(`Non-working pattern changes:`, outsideWorkingPattern.length);
  return outsideWorkingPattern;
};

export const testables = {
  getWorkingPatternForWorkload,
  toUTC,
  fromLocalTimeToUTC,
  categoriseSeverity,
  extractNonWorkingChanges,
};
