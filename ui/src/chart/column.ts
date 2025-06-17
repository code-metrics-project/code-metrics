import type { DatedMetrics } from "@/model/metrics";
import { round } from "lodash";
import { logger } from "@/utils/logger";
import type {
  ChartFormat,
  DatedValue,
  FormattableChartData,
} from "@/chart/common";
import { groupByName, lookupFormatter } from "@/chart/common";

type ColumnSeries = { name: string; data: { x: number; y: number }[] };

export type ColumnChartData = FormattableChartData & {
  series: ColumnSeries[];
};

export function createColumnChartDatasets(
  inputs: Map<string, DatedMetrics>[],
): ColumnChartData {
  const series: ColumnSeries[] = [];
  const formatters: ChartFormat[] = [];

  inputs.forEach((input) => {
    groupByName(input).forEach((data: DatedValue[], name) => {
      const columns: ColumnSeries = { name, data: [] };
      columns.data.push(
        ...data.map((d) => ({ x: d.date.getTime(), y: round(d.value, 1) })),
      );
      series.push(columns);

      // index of formatters should match the index of the series
      formatters.push(lookupFormatter(name));
    });
  });

  const chartData: ColumnChartData = { series, formatters };
  logger(`Chart data:`, chartData);
  return chartData;
}
