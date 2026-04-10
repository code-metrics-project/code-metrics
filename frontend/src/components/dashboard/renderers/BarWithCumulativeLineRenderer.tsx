import { useMemo, useState, useRef } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Legend, Brush } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useThemeStore, THEME_DARK } from "@/store/theme";
import { Button } from "@/components/ui/button";
import type { DatedMetrics } from "@/model/metrics";
import { CHART_CONFIG_COLORS } from "@/utils/chartColors";
import { RotateCcw, Download, Clipboard } from "lucide-react";
import { exportChartAsPNG, copyChartToClipboard } from "@/utils/chartExport";

interface BarWithCumulativeLineRendererProps {
  data: Map<string, DatedMetrics>;
  options?: Record<string, unknown>;
}

export function BarWithCumulativeLineRenderer({ data }: BarWithCumulativeLineRendererProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { theme } = useThemeStore();
  const isDark = theme === THEME_DARK;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLegendClick = (e: any) => {
    const dataKey = e?.dataKey;
    if (!dataKey || typeof dataKey !== "string") return;
    // Toggle the specific dataKey (e.g., "seriesName_daily" or "seriesName_cumulative")
    const newSet = new Set(hiddenSeries);
    if (newSet.has(dataKey)) {
      newSet.delete(dataKey);
    } else {
      newSet.add(dataKey);
    }
    setHiddenSeries(newSet);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLegendMouseEnter = (e: any) => {
    const dataKey = e?.dataKey;
    if (!dataKey || typeof dataKey !== "string") return;
    // Store the full dataKey for hover comparison
    setHoveredSeries(dataKey);
  };

  const handleLegendMouseLeave = () => {
    setHoveredSeries(null);
  };

  const handleReset = () => {
    setHiddenSeries(new Set());
    setHoveredSeries(null);
  };

  const { chartData, chartConfig, seriesNames } = useMemo(() => {
    // Group data by metric name
    const metricsByName = new Map<string, { date: number; value: number }[]>();

    data.forEach((datedMetrics, dateStr) => {
      const date = new Date(dateStr).getTime();
      datedMetrics.entries.forEach((entry, metricName) => {
        if (!metricsByName.has(metricName)) {
          metricsByName.set(metricName, []);
        }
        metricsByName.get(metricName)!.push({ date, value: entry.value });
      });
    });

    // Transform to Recharts format with cumulative values
    const dateMap = new Map<number, Record<string, number>>();
    const seriesNames: string[] = [];

    metricsByName.forEach((dataPoints, name) => {
      seriesNames.push(name);
      const safeKey = name.replace(/[^a-zA-Z0-9]/g, "_");

      // Sort by date for correct cumulative calculation
      const sorted = [...dataPoints].sort((a, b) => a.date - b.date);

      let cumulative = 0;
      sorted.forEach((point) => {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, { date: point.date });
        }
        const entry = dateMap.get(point.date)!;
        entry[`${safeKey}_daily`] = Math.round(point.value * 10) / 10;

        cumulative += point.value;
        entry[`${safeKey}_cumulative`] = Math.round(cumulative * 10) / 10;
      });
    });

    // Sort by date and return as array
    const chartData = Array.from(dateMap.values()).sort((a, b) => a.date - b.date);

    // Build chart config - maps keys to CSS variables
    const chartConfig: ChartConfig = {};
    seriesNames.forEach((name, index) => {
      const safeKey = name.replace(/[^a-zA-Z0-9]/g, "_");
      chartConfig[`${safeKey}_daily`] = {
        label: `${name} (daily)`,
        color: CHART_CONFIG_COLORS[index % CHART_CONFIG_COLORS.length],
      };
      chartConfig[`${safeKey}_cumulative`] = {
        label: `${name} (cumulative)`,
        color: CHART_CONFIG_COLORS[(index + 1) % CHART_CONFIG_COLORS.length],
      };
    });

    return { chartData, chartConfig, seriesNames };
  }, [data]);

  if (chartData.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No data available.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => exportChartAsPNG(chartRef.current, "chart")}
          title="Export as PNG"
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => copyChartToClipboard(chartRef.current)}
          title="Copy to clipboard"
        >
          <Clipboard className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Reset">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div ref={chartRef}>
        <ChartContainer config={chartConfig} className="min-h-75 w-full" style={{ height: 300 }}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const timestamp = typeof value === "number" ? value : Number(value);
                return isNaN(timestamp) ? "" : new Date(timestamp).toLocaleDateString();
              }}
              stroke={isDark ? "hsl(var(--muted-foreground))" : undefined}
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              stroke={isDark ? "hsl(var(--muted-foreground))" : undefined}
              fontSize={12}
              label={{ value: "Daily", angle: -90, position: "insideLeft" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={isDark ? "hsl(var(--muted-foreground))" : undefined}
              fontSize={12}
              label={{ value: "Cumulative", angle: 90, position: "insideRight" }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const timestamp = typeof value === "number" ? value : Number(value);
                    return isNaN(timestamp) ? "" : new Date(timestamp).toLocaleDateString();
                  }}
                />
              }
            />
            <Legend
              onClick={handleLegendClick}
              onMouseEnter={handleLegendMouseEnter}
              onMouseLeave={handleLegendMouseLeave}
              wrapperStyle={{ cursor: "pointer" }}
            />
            {seriesNames.map((name) => {
              const safeKey = name.replace(/[^a-zA-Z0-9]/g, "_");
              const dailyKey = `${safeKey}_daily`;
              const isHidden = hiddenSeries.has(dailyKey);
              const shouldReduceOpacity = hoveredSeries && hoveredSeries !== dailyKey;
              const opacity = isHidden ? 0 : shouldReduceOpacity ? 0.15 : 1;

              return (
                <Bar
                  key={dailyKey}
                  yAxisId="left"
                  dataKey={dailyKey}
                  name={`${name} (daily)`}
                  fill={`var(--color-${dailyKey})`}
                  radius={[4, 4, 0, 0]}
                  opacity={opacity}
                  style={{ transition: "opacity 150ms ease-in-out" }}
                />
              );
            })}
            {seriesNames.map((name) => {
              const safeKey = name.replace(/[^a-zA-Z0-9]/g, "_");
              const cumulativeKey = `${safeKey}_cumulative`;
              const isHidden = hiddenSeries.has(cumulativeKey);
              const shouldReduceOpacity = hoveredSeries && hoveredSeries !== cumulativeKey;
              const opacity = isHidden ? 0 : shouldReduceOpacity ? 0.15 : 1;

              return (
                <Line
                  key={cumulativeKey}
                  yAxisId="right"
                  type="monotone"
                  dataKey={cumulativeKey}
                  name={`${name} (cumulative)`}
                  stroke={`var(--color-${cumulativeKey})`}
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                  connectNulls
                  opacity={opacity}
                  style={{ transition: "opacity 150ms ease-in-out" }}
                />
              );
            })}
            <Brush
              dataKey="date"
              height={30}
              stroke="hsl(var(--primary))"
              tickFormatter={(value) => {
                const timestamp = typeof value === "number" ? value : Number(value);
                if (isNaN(timestamp)) return "";
                return new Date(timestamp).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
              }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
