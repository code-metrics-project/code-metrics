import { useMemo } from "react";
import { ColumnChart, type ColumnChartData } from "@/components/charts";
import type { DatedMetrics } from "@/model/metrics";

interface ColChartRendererProps {
  data: Map<string, DatedMetrics>;
  options?: Record<string, unknown>;
}

export function ColChartRenderer({ data }: ColChartRendererProps) {
  const chartData = useMemo<ColumnChartData>(() => {
    const series: ColumnChartData["series"] = [];

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
      series.push({
        name,
        data: dataPoints.sort((a, b) => a.x - b.x),
      });
    });

    return { series };
  }, [data]);

  if (chartData.series.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No data available.</div>;
  }

  return <ColumnChart chartData={chartData} height={300} />;
}
