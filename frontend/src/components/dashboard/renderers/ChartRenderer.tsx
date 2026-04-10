import { useMemo } from "react";
import { MultiChart, type MultiChartData } from "@/components/charts";
import type { DatedMetrics } from "@/model/metrics";

interface ChartRendererProps {
  data: Map<string, DatedMetrics>;
}

export function ChartRenderer({ data }: ChartRendererProps) {
  const chartData = useMemo<MultiChartData>(() => {
    const datasets: MultiChartData["datasets"] = [];

    // Group by metric name across all dates
    const metricsByName = new Map<string, { x: number; y: number }[]>();

    data.forEach((datedMetrics, dateStr) => {
      const date = new Date(dateStr).getTime();
      datedMetrics.entries.forEach((entry, metricName) => {
        if (!metricsByName.has(metricName)) {
          metricsByName.set(metricName, []);
        }
        metricsByName.get(metricName)!.push({ x: date, y: entry.value });
      });
    });

    metricsByName.forEach((dataPoints, name) => {
      datasets.push({
        name,
        data: dataPoints.sort((a, b) => a.x - b.x),
      });
    });

    return { datasets };
  }, [data]);

  if (chartData.datasets.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No data available.</div>;
  }

  return <MultiChart chartData={chartData} height={300} showToolbar={true} />;
}
