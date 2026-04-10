import { useState, useCallback, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, Brush, ReferenceArea, LabelList } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useThemeStore, THEME_DARK } from "@/store/theme";
import { RotateCcw, Download, Clipboard } from "lucide-react";
import { CHART_CONFIG_COLORS } from "@/utils/chartColors";
import { exportChartAsPNG, copyChartToClipboard } from "@/utils/chartExport";

export interface MultiChartDataset {
  name: string;
  data: { x: number; y: number }[];
}

export interface MultiChartData {
  datasets: MultiChartDataset[];
}

export interface MultiChartProps {
  chartData: MultiChartData;
  height?: number;
  className?: string;
  showToolbar?: boolean;
  showDataLabels?: boolean;
}

export function MultiChart({
  chartData,
  height = 400,
  className,
  showToolbar = true,
  showDataLabels = false,
}: MultiChartProps) {
  const { theme } = useThemeStore();
  const isDark = theme === THEME_DARK;
  const chartRef = useRef<HTMLDivElement>(null);

  // Transform data for Recharts - combine all datasets by x (date)
  const transformedData = transformData(chartData);

  // Zoom state
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [left, setLeft] = useState<number | "dataMin">("dataMin");
  const [right, setRight] = useState<number | "dataMax">("dataMax");
  const [isZooming, setIsZooming] = useState(false);

  // Legend visibility state
  const [visibleDatasets, setVisibleDatasets] = useState<Set<string>>(new Set(chartData.datasets.map((ds) => ds.name)));
  const [hoveredDataset, setHoveredDataset] = useState<string | null>(null);

  const resetZoom = useCallback(() => {
    setLeft("dataMin");
    setRight("dataMax");
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setHoveredDataset(null);
    // Reset visibility as well
    setVisibleDatasets(new Set(chartData.datasets.map((ds) => ds.name)));
  }, [chartData.datasets]);

  const handleLegendClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const dataKey = e?.dataKey;
      if (!dataKey || typeof dataKey !== "string") return;

      // dataKey comes as sanitized key from Legend, we need to find original dataset name
      const datasetName = chartData.datasets.find((ds) => ds.name.replace(/[^a-zA-Z0-9]/g, "_") === dataKey)?.name;

      if (!datasetName) return;

      const newVisible = new Set(visibleDatasets);
      if (newVisible.has(datasetName)) {
        newVisible.delete(datasetName);
      } else {
        newVisible.add(datasetName);
      }
      setVisibleDatasets(newVisible);
    },
    [visibleDatasets, chartData.datasets]
  );

  const handleLegendMouseEnter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const dataKey = e?.dataKey;
      if (!dataKey || typeof dataKey !== "string") return;
      const datasetName = chartData.datasets.find((ds) => ds.name.replace(/[^a-zA-Z0-9]/g, "_") === dataKey)?.name;
      if (datasetName) {
        setHoveredDataset(datasetName);
      }
    },
    [chartData.datasets]
  );

  const handleLegendMouseLeave = useCallback(() => {
    setHoveredDataset(null);
  }, []);

  const handleMouseDown = useCallback((e: { activeLabel?: string | number }) => {
    if (e?.activeLabel) {
      setRefAreaLeft(Number(e.activeLabel));
      setIsZooming(true);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: { activeLabel?: string | number }) => {
      if (isZooming && e?.activeLabel) {
        setRefAreaRight(Number(e.activeLabel));
      }
    },
    [isZooming]
  );

  const handleMouseUp = useCallback(() => {
    if (refAreaLeft !== null && refAreaRight !== null) {
      const [newLeft, newRight] = [refAreaLeft, refAreaRight].sort((a, b) => a - b);
      setLeft(newLeft);
      setRight(newRight);
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsZooming(false);
  }, [refAreaLeft, refAreaRight]);

  // Build config for shadcn chart - maps dataset names to CSS variables
  // Note: Keys must be sanitized to match the dataKey used in Line components
  const chartConfig: ChartConfig = {};
  chartData.datasets.forEach((ds, index) => {
    const safeKey = ds.name.replace(/[^a-zA-Z0-9]/g, "_");
    chartConfig[safeKey] = {
      label: ds.name,
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
          <LineChart
            data={transformedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const timestamp = typeof value === "number" ? value : Number(value);
                return isNaN(timestamp) ? "" : new Date(timestamp).toLocaleDateString();
              }}
              stroke={isDark ? "hsl(var(--muted-foreground))" : undefined}
              fontSize={12}
              domain={[left, right]}
              allowDataOverflow
              type="number"
            />
            <YAxis stroke={isDark ? "hsl(var(--muted-foreground))" : undefined} fontSize={12} />
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
            {chartData.datasets.map((dataset) => {
              const safeKey = dataset.name.replace(/[^a-zA-Z0-9]/g, "_");
              const isVisible = visibleDatasets.has(dataset.name);
              const isHovered = hoveredDataset === dataset.name;
              const shouldReduceOpacity = hoveredDataset !== null && !isHovered;
              return (
                <Line
                  key={dataset.name}
                  type="monotone"
                  dataKey={safeKey}
                  name={dataset.name}
                  stroke={`var(--color-${safeKey})`}
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 2, fill: `var(--color-${safeKey})` }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                  connectNulls
                  isAnimationActive={false}
                  opacity={isVisible ? (shouldReduceOpacity ? 0.15 : 1) : 0}
                  style={{
                    transition: "opacity 150ms ease-in-out",
                  }}
                >
                  {showDataLabels && (
                    <LabelList dataKey={safeKey} position="top" offset={8} className="fill-foreground" fontSize={10} />
                  )}
                </Line>
              );
            })}
            {refAreaLeft !== null && refAreaRight !== null && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
              />
            )}
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
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function transformData(chartData: MultiChartData): Record<string, unknown>[] {
  // Group all data points by date
  const dateMap = new Map<number, Record<string, unknown>>();

  chartData.datasets.forEach((dataset) => {
    const safeKey = dataset.name.replace(/[^a-zA-Z0-9]/g, "_");
    dataset.data.forEach((point) => {
      if (!dateMap.has(point.x)) {
        dateMap.set(point.x, { date: point.x });
      }
      const entry = dateMap.get(point.x)!;
      entry[safeKey] = point.y;
    });
  });

  // Sort by date and return as array
  return Array.from(dateMap.values()).sort((a, b) => (a.date as number) - (b.date as number));
}
