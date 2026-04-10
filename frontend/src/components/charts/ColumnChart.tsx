import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Brush, LabelList } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useThemeStore, THEME_DARK } from "@/store/theme";
import { RotateCcw, Download, Clipboard } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { CHART_CONFIG_COLORS } from "@/utils/chartColors";
import { exportChartAsPNG, copyChartToClipboard } from "@/utils/chartExport";

export interface ColumnChartSeries {
  name: string;
  data: { x: number; y: number }[];
}

export interface ColumnChartData {
  series: ColumnChartSeries[];
  categories?: string[];
}

export interface ColumnChartProps {
  chartData: ColumnChartData;
  height?: number;
  className?: string;
  stacked?: boolean;
  showToolbar?: boolean;
  showDataLabels?: boolean;
}

export function ColumnChart({
  chartData,
  height = 400,
  className,
  stacked = false,
  showToolbar = true,
  showDataLabels = false,
}: ColumnChartProps) {
  const { theme } = useThemeStore();
  const isDark = theme === THEME_DARK;
  const chartRef = useRef<HTMLDivElement>(null);
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set(chartData.series.map((s) => s.name)));
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  // Transform data for Recharts
  const transformedData = transformData(chartData);

  const resetZoom = useCallback(() => {
    setBrushStartIndex(undefined);
    setBrushEndIndex(undefined);
    setHoveredSeries(null);
    // Reset visibility as well
    setVisibleSeries(new Set(chartData.series.map((s) => s.name)));
  }, [chartData.series]);

  const handleLegendClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const dataKey = e?.dataKey;
      if (!dataKey || typeof dataKey !== "string") return;

      // dataKey comes as sanitized key from Legend, we need to find original series name
      const seriesName = chartData.series.find((s) => s.name.replace(/[^a-zA-Z0-9]/g, "_") === dataKey)?.name;

      if (!seriesName) return;

      const newVisible = new Set(visibleSeries);
      if (newVisible.has(seriesName)) {
        newVisible.delete(seriesName);
      } else {
        newVisible.add(seriesName);
      }
      setVisibleSeries(newVisible);
    },
    [visibleSeries, chartData.series]
  );

  const handleLegendMouseEnter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const dataKey = e?.dataKey;
      if (!dataKey || typeof dataKey !== "string") return;
      const seriesName = chartData.series.find((s) => s.name.replace(/[^a-zA-Z0-9]/g, "_") === dataKey)?.name;
      if (seriesName) {
        setHoveredSeries(seriesName);
      }
    },
    [chartData.series]
  );

  const handleLegendMouseLeave = useCallback(() => {
    setHoveredSeries(null);
  }, []);

  // Build config for shadcn chart - maps series names to CSS variables
  // Note: Keys must be sanitized to match the dataKey used in Bar components
  const chartConfig: ChartConfig = {};
  chartData.series.forEach((s, index) => {
    const safeKey = s.name.replace(/[^a-zA-Z0-9]/g, "_");
    chartConfig[safeKey] = {
      label: s.name,
      color: CHART_CONFIG_COLORS[index % CHART_CONFIG_COLORS.length],
    };
  });

  return (
    <div className={className}>
      {showToolbar && (
        <div className="mb-2 flex items-center justify-end gap-1">
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
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom} title="Reset">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <div ref={chartRef}>
        <ChartContainer config={chartConfig} className="min-h-50 w-full" style={{ height }}>
          <BarChart data={transformedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                if (typeof value === "number") {
                  return isNaN(value) ? "" : new Date(value).toLocaleDateString();
                }
                return value;
              }}
              stroke={isDark ? "hsl(var(--muted-foreground))" : undefined}
              fontSize={12}
            />
            <YAxis stroke={isDark ? "hsl(var(--muted-foreground))" : undefined} fontSize={12} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    if (typeof value === "number") {
                      return isNaN(value) ? "" : new Date(value).toLocaleDateString();
                    }
                    return String(value);
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
            {chartData.series.map((series) => {
              const safeKey = series.name.replace(/[^a-zA-Z0-9]/g, "_");
              const isVisible = visibleSeries.has(series.name);
              const isHovered = hoveredSeries === series.name;
              const shouldReduceOpacity = hoveredSeries !== null && !isHovered;
              return (
                <Bar
                  key={series.name}
                  dataKey={safeKey}
                  name={series.name}
                  fill={`var(--color-${safeKey})`}
                  stackId={stacked ? "stack" : undefined}
                  opacity={isVisible ? (shouldReduceOpacity ? 0.15 : 1) : 0}
                  style={{
                    transition: "opacity 150ms ease-in-out",
                  }}
                  radius={[4, 4, 0, 0]}
                >
                  {showDataLabels && (
                    <LabelList dataKey={safeKey} position="top" offset={4} className="fill-foreground" fontSize={10} />
                  )}
                </Bar>
              );
            })}
            <Brush
              dataKey="date"
              height={30}
              stroke="hsl(var(--primary))"
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
              onChange={(e) => {
                setBrushStartIndex(e.startIndex);
                setBrushEndIndex(e.endIndex);
              }}
              tickFormatter={(value) => {
                const timestamp = typeof value === "number" ? value : Number(value);
                if (isNaN(timestamp)) return "";
                return new Date(timestamp).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
              }}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function transformData(chartData: ColumnChartData): Record<string, unknown>[] {
  // Group all data points by date
  const dateMap = new Map<number | string, Record<string, unknown>>();

  chartData.series.forEach((series) => {
    const safeKey = series.name.replace(/[^a-zA-Z0-9]/g, "_");
    series.data.forEach((point) => {
      const key = point.x;
      if (!dateMap.has(key)) {
        dateMap.set(key, { date: key });
      }
      const entry = dateMap.get(key)!;
      entry[safeKey] = point.y;
    });
  });

  // Sort by date and return as array
  return Array.from(dateMap.values()).sort((a, b) => {
    const aDate = a.date as number;
    const bDate = b.date as number;
    return aDate - bDate;
  });
}
