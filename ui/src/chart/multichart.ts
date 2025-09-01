import type { DatedMetrics } from "@/model/metrics";
import { verbose } from "@/utils/logger";
import type { ChartFormat, DatedValue, FormattableChartData } from "@/chart/common";
import { groupByName, lookupFormatter } from "@/chart/common";
import type { ChartTypes } from "@/chart/chart-types";

type Data = {
  x: number;
  y: number | number[];
};

type ChartDataset = {
  data: Data[];
  name: string;
  pointRadius: number;
  type?: ChartTypes;
  borderWidth: number;
};

export type MultiChartData = FormattableChartData & {
  datasets: ChartDataset[];
};

export interface AxisOptions {
  min: number;
  max: number;
}

export function createMultiChartDatasets(
  inputs: Map<string, DatedMetrics>[],
  overrides: Record<string, AxisOptions> = {},
): MultiChartData {
  const datasets: ChartDataset[] = [];
  const formatters: ChartFormat[] = [];

  inputs.forEach((input) => {
    groupByName(input).forEach((data: DatedValue[], name) => {
      const sortedData = data
        .sort((a, b) => (a.date.getTime() > b.date.getTime() ? 1 : -1))
        .map((d) => ({ x: d.date.getTime(), y: d.value }));

      const values = data.map((d) => d.value);
      const queryMin = Math.min(...values);
      const queryMax = Math.max(...values);

      datasets.push({
        data: sortedData,
        name,
        pointRadius: 0,
        borderWidth: 2,
      });

      // index of formatters should match the index of the series
      formatters.push(lookupFormatter(name, queryMin, queryMax));
    });
  });

  const chartData = {
    datasets,
    formatters,
  };
  verbose(`Chart data:`, chartData);
  return chartData;
}
