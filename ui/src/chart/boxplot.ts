import type { DatedMetrics } from "@/model/metrics";
import type { AxisOptions } from "@/chart/multichart";
import { createMultiChartDatasets } from "@/chart/multichart";
import { getBuckets } from "@/utils/rollingAverages";

export function createBoxPlotChartData(
  inputs: Map<string, DatedMetrics>,
  overrides: Record<string, AxisOptions> = {},
) {
  const buckets = getBuckets<number>(inputs, 60);
  const chartData = createMultiChartDatasets([inputs], overrides);
  chartData.datasets[0].type = "boxPlot";
  chartData.datasets[0].data.forEach((dataPoint) => {
    const bucket = buckets.find(
      (bucket) =>
        dataPoint.x >= bucket.startDate && dataPoint.x <= bucket.endDate,
    );
    if (!bucket) console.warn("Datapoint sits outside bucket range");
    if (Array.isArray(dataPoint.y)) {
      bucket?.values.push(...dataPoint.y);
    } else {
      bucket?.values.push(dataPoint.y);
    }
  });
  const quartileBuckets = buckets.map((bucket) => {
    bucket.values.sort((a, b) => a - b);
    const quartile2 = Math.floor(bucket.values.length / 4);
    const quartile3 = Math.floor(bucket.values.length / 2);
    const quartile4 = Math.floor(bucket.values.length / (4 / 3));
    return {
      ...bucket,
      values: bucket.values.length
        ? [
            Math.min(...bucket.values),
            bucket.values[quartile2],
            bucket.values[quartile3],
            bucket.values[quartile4],
            Math.max(...bucket.values),
          ]
        : [0, 0, 0, 0, 0],
    };
  });
  chartData.datasets[0].data = quartileBuckets.map((bucket) => ({
    x: bucket.endDate,
    y: bucket.values,
  }));
  return chartData;
}
