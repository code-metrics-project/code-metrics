import { dateDiffDays, getRelativeDateAsString, MILLIS_PER_DAY } from "./date";
import { logger, verbose } from "./logger/logger";
import {
  DatedMetrics,
  IntermediaryDatedMetrics, DateStamp,
  MetricEntry,
  MetricItem,
  MetricItemDimensions,
  MetricsWireFormat
} from "../model/metrics";
import { isMatch } from "lodash";

export enum MissingBehaviour {
  NONE,
  USE_LAST_VALUE,
  SET_TO_ZERO,
}

type MetricsMetadata = {
  earliestDate: Date | null;
  latestDate: Date | null;
  min?: number;
  max?: number;
  uniqueAxisNames: string[];

  /**
   * A dimension set is a combination of dimensions that can be used to identify a set of metrics.
   * For example, a metric might have dimensions { repoGroup: "foo", workload: "bar" }.
   */
  uniqueDimensionSets: MetricItemDimensions[];
};

/**
 * For each name (e.g. tag, workload), add values for dates where there is no data.
 * When a value is missing, use either zero, or the last known value for that name.
 * @param input
 * @param missingBehaviour
 * @param collapseToSingleByDay whether to collapse multiple entries on a single day to a single entry
 */
export const interpolateMissing = (
  input: Map<DateStamp, DatedMetrics>,
  missingBehaviour: MissingBehaviour,
  collapseToSingleByDay = true,
): Map<DateStamp, DatedMetrics> => {
  const metadata = getMetricsMetadata(input);
  return interpolateMissingUsingMetadata(input, metadata, missingBehaviour, collapseToSingleByDay);
};

/**
 * For each name (e.g. tag, workload), add values for dates where there is no data.
 * When a value is missing, use either zero, or the last known value for that name.
 * @param input
 * @param metadata
 * @param missingBehaviour
 * @param collapseToSingleByDay
 */
const interpolateMissingUsingMetadata = (
  input: Map<DateStamp, DatedMetrics>,
  metadata: MetricsMetadata,
  missingBehaviour: MissingBehaviour,
  collapseToSingleByDay: boolean,
): Map<DateStamp, DatedMetrics> => {
  if (metadata.earliestDate != null && metadata.latestDate != null) {
    return interpolateMissingInternal(
      input,
      metadata,
      missingBehaviour,
      collapseToSingleByDay,
    );
  }
  return input;
};

/**
 * For each name (e.g. tag, workload), add values for dates where there is no data.
 * When a value is missing, use either zero, or the last known value for that name.
 * @param input
 * @param metadata
 * @param missingBehaviour
 * @param collapseToSingleByDay
 */
const interpolateMissingInternal = (
  input: Map<DateStamp, DatedMetrics>,
  metadata: MetricsMetadata,
  missingBehaviour: MissingBehaviour,
  collapseToSingleByDay: boolean,
): Map<DateStamp, DatedMetrics> => {
  if (missingBehaviour === MissingBehaviour.NONE) {
    return input;
  }
  const output = new Map<DateStamp, DatedMetrics>();

  const { earliestDate, latestDate } = metadata;

  // days between earliest and latest date
  const days = Math.round(dateDiffDays(earliestDate, latestDate) / MILLIS_PER_DAY);
  logger(`${days} days between ${earliestDate.toISOString()} and ${latestDate.toISOString()}`);

  for (let i = 0; i <= days; i++) {
    const current = getRelativeDateAsString(earliestDate, i);
    verbose(`Checking date: ${current}`);

    const datedEntries: DatedMetrics = input.get(current) ?? {};
    const outputDatedEntries = output.get(current) ?? {};

    for (const axisName of metadata.uniqueAxisNames) {
      let outputAxisEntries: MetricItem[] = [];

      for (const dimensionSet of metadata.uniqueDimensionSets) {
        let entries: MetricItem[];

        const existingEntries = datedEntries[axisName]?.filter((m) => isMatch(m.dimensions, dimensionSet));
        if (existingEntries?.length) {
          entries = existingEntries;
        } else {
          switch (missingBehaviour) {
            case MissingBehaviour.SET_TO_ZERO:
              entries = [{ dimensions: dimensionSet, date: new Date(current), value: 0 }];
              break;

            case MissingBehaviour.USE_LAST_VALUE:
              if (i === 0) {
                // no previous days - use 0
                entries = [{ dimensions: dimensionSet, date: new Date(current), value: 0 }];
              } else {
                // get previous day's entries for this tag
                const previous = getRelativeDateAsString(earliestDate, i - 1);
                const previousDayEntries = output.get(previous) as DatedMetrics;

                const previousDayMetrics: MetricItem[] = previousDayEntries[axisName]?.filter((m) => isMatch(m.dimensions, dimensionSet)) ?? [];
                entries = previousDayMetrics.map((m) => ({ ...m, date: new Date(current) }));
              }
              break;
          }
          verbose(`Interpolated ${axisName} value for ${current} to`, entries[0]?.value);
        }

        // if more than one entry for this day and tag, choose most recent
        if (entries.length > 1 && collapseToSingleByDay) {
          const latestItem = entries.reduce((acc, m) => (m.date.getTime() > acc.date.getTime() ? m : acc));
          entries = [latestItem];
        }

        const otherDimensionEntries = outputAxisEntries?.filter((m) => !isMatch(m.dimensions, dimensionSet)) ?? [];
        outputAxisEntries = [...otherDimensionEntries, ...entries];
      }

      outputDatedEntries[axisName] = outputAxisEntries;
    }

    output.set(current, outputDatedEntries);
  }

  return output;
};

export const getMetricsMetadata = (
  input: Map<DateStamp, DatedMetrics>,
  valueExtractor: ((metric: MetricItem, date: string, axisName: string) => number) | undefined = undefined,
): MetricsMetadata => {
  const allNames: string[] = [];
  const allDimensionSets: MetricItemDimensions[] = [];
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;
  let minVal = 0;
  let maxVal = 0;

  input.forEach((m, date) => {
    const parsedDate = new Date(date);
    if (!earliestDate || parsedDate.getTime() < earliestDate.getTime()) {
      earliestDate = parsedDate;
    }
    if (!latestDate || parsedDate.getTime() > latestDate.getTime()) {
      latestDate = parsedDate;
    }

    for (const [axisName, items] of Object.entries(m)) {
      if (!allNames.includes(axisName)) {
        allNames.push(axisName);
      }

      items.forEach((metric) => {
        if (!allDimensionSets.find((d) => isMatch(d, metric.dimensions))) {
          allDimensionSets.push(metric.dimensions);
        }
        if (valueExtractor) {
          const val = valueExtractor(metric, date, axisName);
          minVal = Math.min(minVal, val);
          maxVal = Math.max(maxVal, val);
        }
      });
    }
  });

  return { uniqueAxisNames: allNames, uniqueDimensionSets: allDimensionSets, earliestDate, latestDate, min: minVal, max: maxVal };
};

export const convertMetricsMapToObj = (m: Map<string, IntermediaryDatedMetrics>): MetricsWireFormat => {
  const converted: Record<string, Record<string, MetricEntry>> = {};
  m.forEach((metrics, date) => {
    const flattened: Record<string, MetricEntry> = {};
    metrics.entries.forEach((entry, key) => {
      flattened[key] = entry;
    });
    converted[date] = flattened;
  });
  return converted;
};

/**
 * Average multiple daily entries into a single entry per day,
 * preserving the tag names.
 * @param input
 */
export const averageMultipleDailyEntriesByDay = (input: Map<DateStamp, DatedMetrics>): Map<DateStamp, DatedMetrics> => {
  const metadata = getMetricsMetadata(input);

  const output = new Map<DateStamp, DatedMetrics>();

  for (const [date, datedMetrics] of input) {
    for (const [axisName, metrics] of Object.entries(datedMetrics)) {
      for (const dimensionSet of metadata.uniqueDimensionSets) {
        const matchingMetrics = metrics.filter((m) => isMatch(m.dimensions, dimensionSet));
        if (matchingMetrics.length > 1) {
          const total = matchingMetrics.reduce((acc, m) => acc + m.value, 0);
          const average = total / matchingMetrics.length;
          const newMetric = createMetricItem(date, dimensionSet, average);
          const datedMetrics = { [axisName]: [newMetric] };
          output.set(date, datedMetrics);
        }
      }
    }
  }

  return output;
};

/**
 * Create a new metric item with the given date and dimensions.
 * @param date
 * @param dimensions
 * @param value
 */
export const createMetricItem = (
  date: Date | string,
  dimensions: MetricItemDimensions,
  value: number = 0,
): MetricItem => {
  return {
    dimensions,
    date: typeof date === "string" ? new Date(date) : date,
    value,
  };
};
