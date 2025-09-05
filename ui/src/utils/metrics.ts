import type { ColumnChartData } from "@/chart/column";
import type { DatedMetrics, MetricEntry } from "@/model/metrics";

type MetricsMetadata = {
  earliestDate: Date | null;
  latestDate: Date | null;
  allNames: string[];
  min?: number;
  max?: number;
};

export function getMetricsMetadata(
  input: Map<string, DatedMetrics>,
  valueExtractor: ((entries: MetricEntry, date: string, name: string) => number) | undefined = undefined,
): MetricsMetadata {
  const allNames: string[] = [];
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

    m.entries.forEach((entries, name) => {
      if (!allNames.includes(name)) {
        allNames.push(name);
      }
      if (valueExtractor) {
        const val = valueExtractor(entries, date, name);
        minVal = Math.min(minVal, val);
        maxVal = Math.max(maxVal, val);
      }
    });
  });

  return { allNames, earliestDate, latestDate, min: minVal, max: maxVal };
}

export function convertMetricsObjToMap(o: Record<string, Record<string, MetricEntry>>): Map<string, DatedMetrics> {
  const converted = new Map<string, DatedMetrics>();
  for (const [date, metrics] of Object.entries(o)) {
    const entriesMap = new Map<string, MetricEntry>();
    for (const [key, entry] of Object.entries(metrics)) {
      entriesMap.set(key, entry);
    }
    converted.set(date, { entries: entriesMap });
  }
  return converted;
}

/**
 * Sum the values of all the metric values.
 * @param input
 */
export function sumAllMetricValues(input: Map<string, DatedMetrics>): number {
  return Array.from(input.values())
    .flatMap((v) => {
      return Array.from(v.entries.values()).map((entry) => entry.value);
    })
    .reduce((previousValue, currentValue) => {
      return previousValue + currentValue;
    }, 0);
}

export function convertColumnChartDatasetToTable(chartData: ColumnChartData): Record<string, string>[] {
  const items: Record<string, string>[] = [];

  chartData.series.forEach(({ name, data }, index) => {
    data.forEach((datum) => {
      const isoDate = new Date(datum.x).toISOString();
      let item = items.find((item) => item.date === isoDate);
      if (!item) {
        item = { date: isoDate };
        items.push(item);
      }

      let formattedValue: string;
      const formatter = chartData.formatters?.[index];
      if (formatter) {
        formattedValue = formatter.format(datum.y);
      } else {
        formattedValue = datum.y.toString();
      }
      item[name] = formattedValue;
    });
  });

  return items;
}
