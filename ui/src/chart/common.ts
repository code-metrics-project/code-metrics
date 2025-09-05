import { type DatedMetrics } from "@/model/metrics";
import { logger } from "@/utils/logger";
import { merge, round } from "lodash";
import { roundTo } from "@/utils/math";
import { getChartConfig } from "@/queries/config";
import type { MetricEntry } from "@/model/metrics";

export type DatedValue = {
  date: Date;
  value: number;
};

export type ChartValueFormatter = (value: number) => string;

export type ChartFormat = {
  seriesName: string;
  min?: number;
  max?: number;
  format: ChartValueFormatter;
  colourVariant?: string;
};

export type FormattableChartData = {
  formatters?: ChartFormat[];
};

export function groupByName(input: Map<string, DatedMetrics>): Map<string, DatedValue[]> {
  const namedData = new Map<string, DatedValue[]>();
  input.forEach((datedMetrics, date) => {
    datedMetrics.entries.forEach((entry, name) => {
      const data = namedData.get(name) ?? [];
      data.push({ date: new Date(date), value: entry.value });
      namedData.set(name, data);
    });
  });
  return namedData;
}

export function calculatePercentageByTag(
  combined: Map<string, DatedMetrics>,
  tagClassifier?: (tag: string) => string,
): Map<string, number> {
  return calculateValuesByTag(combined, true, tagClassifier);
}

export function calculateValuesByTag(
  combined: Map<string, DatedMetrics>,
  calculatePercentage: boolean,
  tagClassifier?: (tag: string) => string,
): Map<string, number> {
  const classCounts: Record<string, number> = {};
  const grandTotals: Record<string, number> = {};
  let days = 0;

  for (const value of combined.values()) {
    days++;
    value.entries.forEach((metric, tag) => {
      const workloadCount = classCounts[tag] ?? 0;
      classCounts[tag] = workloadCount + metric.value;

      const totalName = tagClassifier ? tagClassifier(tag) : "all";
      const grandTotal = grandTotals[totalName] ?? 0;
      grandTotals[totalName] = grandTotal + metric.value;
    });
  }
  logger(`Calculated percentages over ${days} days`);

  const data = new Map<string, number>();
  Object.entries(classCounts).forEach(([tag, classTotal]) => {
    if (calculatePercentage) {
      const totalName = tagClassifier ? tagClassifier(tag) : "all";
      const grandTotal = grandTotals[totalName] ?? 0;
      const percentage = grandTotal > 0 ? round((classTotal / grandTotal) * 100, 1) : 0;

      data.set(tag, percentage);
    } else {
      data.set(tag, classTotal);
    }
  });
  return data;
}

/**
 * Split the dataset into separate datasets based on the group dimension.
 * For example, if there are metrics with the tags "coverage/athena" and "coverage/gaia",
 * two separate datasets are created, one containing the metrics for "athena" and the other for "gaia".
 * @param input
 */
export function splitDatasetOnGroupDimension(input: Map<string, DatedMetrics>): Map<string, DatedMetrics>[] {
  const split: Record<string, Map<string, DatedMetrics>> = {};

  for (const [date, metrics] of input) {
    for (const [tag, metric] of metrics.entries) {
      // for example, tag = "coverage/athena" becomes groupDimension = "athena"
      const groupDimension = tag.split("/")[1];

      let series = split[groupDimension];
      if (!series) {
        series = new Map<string, DatedMetrics>();
        split[groupDimension] = series;
      }

      let datedMetrics = series.get(date);
      if (!datedMetrics) {
        datedMetrics = { entries: new Map<string, MetricEntry>() };
        series.set(date, datedMetrics);
      }
      datedMetrics.entries.set(tag, metric);
    }
  }
  return Object.values(split);
}

/**
 * Convert seconds to format HH:MM (e.g. 99:30)
 * @param seconds
 */
export function formatSecondsAsHoursAndMinutes(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Convert seconds to format DD:HH (e.g. 99:30)
 * @param seconds
 */
export function formatSecondsAsDaysAndHours(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

/**
 * Format a decimal as a percentage.
 * @param value
 */
export function formatValueAsPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const defaultChartValueFormatter = (value: number): string => roundTo(value, 1).toString();

export function lookupFormatter(seriesName: string, min?: number, max?: number): ChartFormat {
  const axisName = seriesName.split("/")[0];
  const chartConfig = getChartConfig(axisName);
  const format = chartConfig?.valueFormatter ?? defaultChartValueFormatter;
  const colourVariant = chartConfig?.axes.find((axis) => axis.axisName === axisName)?.variant;

  return {
    seriesName,
    format,
    colourVariant,
    min,
    max: chartConfig?.yAxisMax ?? max,
  };
}

/**
 * Builds the Y axes for the chart, based on the series names and formatters.
 *
 * This will combine axes based on the prefix of the series name.
 * Series with the same prefix will be grouped together.
 * For example, in a chart with three series named
 * "coverage/athena", "coverage/gaia", and "repo-churn/athena",
 * the first two series will be grouped together on the same Y axis, and the third
 * series will be on a separate Y axis.
 * @param formatters
 */
export const buildAxes = (formatters: ChartFormat[]): ApexYAxis[] => {
  const yaxes: ApexYAxis[] = [];
  for (const formatter of formatters) {
    const namePrefix = formatter.seriesName.split("/")[0];

    // find the axis that already contains a series with the same prefix
    let axis = yaxes.find((y) => {
      const existingSeries = (y.seriesName as string[]) ?? [];
      return existingSeries.map((seriesName) => seriesName.split("/")[0]).includes(namePrefix);
    });

    if (axis) {
      (axis.seriesName as string[]).push(formatter.seriesName);
    } else {
      axis = {
        seriesName: [formatter.seriesName],
        title: { text: namePrefix },
        labels: { formatter: formatter.format },
        opposite: !!(yaxes.length % 2),
      };
      yaxes.push(axis);
    }

    if (formatter.min) {
      axis.min = Math.min((axis.min as number) ?? 0, formatter.min);
    }
    if (formatter.max) {
      axis.max = Math.max((axis.max as number) ?? 0, formatter.max);
    }
  }
  return yaxes;
};

/**
 * Return a new array containing the merged axes from two sets of axes.
 * Specifically, the properties in `b` take precedence over the items in `a`.
 *
 * Note that the order of the axes is preserved.
 * @param a
 * @param b
 */
export const mergeAxes = (a: ApexYAxis | ApexYAxis[], b: ApexYAxis | ApexYAxis[]): ApexYAxis[] => {
  const axes = [];
  const aArr = Array.isArray(a) ? a : [a];
  const bArr = Array.isArray(b) ? b : [b];

  for (let i = 0; i < Math.max(aArr.length, bArr.length); i++) {
    const merged = merge({}, i < aArr.length ? aArr[i] : {}, i < bArr.length ? bArr[i] : {});
    axes.push(merged);
  }

  return axes;
};

/**
 * Build the data labels for the chart.
 * If formatters are provided, the data labels will use the same formatter as the axis labels.
 * @param showDataLabels
 * @param dataLabels
 * @param formatters
 */
export function buildDataLabels(
  showDataLabels: boolean,
  dataLabels: ApexDataLabels | undefined,
  formatters: ChartFormat[] | undefined,
) {
  dataLabels = dataLabels || {};

  if (showDataLabels) {
    dataLabels.enabled = true;

    // use the same formatter for the data labels as the axis labels
    if (formatters?.length) {
      dataLabels.formatter = (value: number, opts: { seriesIndex: number | undefined }): string => {
        if (opts.seriesIndex !== undefined && opts.seriesIndex < formatters.length) {
          const f = formatters[opts.seriesIndex];
          if (f) {
            return f.format(value);
          }
        }
        return defaultChartValueFormatter(value);
      };
    }
  } else {
    dataLabels.enabled = false;
  }
  return dataLabels;
}
