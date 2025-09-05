import type { DatedMetrics } from "@/model/metrics";
import { getColourForKey } from "@/utils/colours";
import type { FormattableChartData } from "@/chart/common";
import { calculateValuesByTag, splitDatasetOnGroupDimension } from "@/chart/common";

export type DoughnutChartData = {
  data: number[];
  colors: string[];
  labels: string[];
};

export type DoughnutChartDataset = FormattableChartData & {
  dataset: DoughnutChartData[];
};

/**
 * Create a single doughnut chart dataset.
 * @param metrics
 */
export function createDoughnutChartData(metrics: Map<string, number>): DoughnutChartData {
  const labels = [...metrics.keys()];
  const data = [...metrics.values()];
  const colors = [...metrics.keys()].map((key, index) => getColourForKey(key, index));
  return {
    data,
    labels,
    colors,
  };
}

/**
 * Create datasets for zero or more doughnut charts.
 * @param inputs
 */
export function createDoughnutChartDatasets(inputs: Map<string, DatedMetrics>[]): DoughnutChartDataset {
  // Doughnut charts are a special case where we need to calculate the relative percentages
  // between tags *within each dataset*.
  // This is because for each dataset, there will be a separate chart.
  const dataset = inputs.flatMap((input) => {
    const split = splitDatasetOnGroupDimension(input);
    return split.map((data) => {
      const series = calculateValuesByTag(data, false);
      return createDoughnutChartData(series);
    });
  });
  return { dataset };
}
