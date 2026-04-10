import { useMemo, useRef, useCallback, useState } from "react";
import { ComposedChart, XAxis, YAxis, CartesianGrid, ReferenceArea, Bar } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useThemeStore, THEME_DARK } from "@/store/theme";
import { RotateCcw, Download, Clipboard } from "lucide-react";
import { exportChartAsPNG, copyChartToClipboard } from "@/utils/chartExport";
import { createBoxPlotData, type BoxPlotDataPoint } from "@/utils/boxplot";
import type { DatedMetrics } from "@/model/metrics";

interface BoxPlotRendererProps {
  data: Map<string, DatedMetrics>;
  options?: {
    bucketSizeInDays?: number;
  };
}

interface BoxPlotChartDataPoint {
  date: number;
  dateLabel: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
  // Stacked bar values for box plot rendering
  // The trick: use stacked bars where first bar is transparent (from 0 to Q1)
  // and second bar is visible (from Q1 to Q3)
  base: number; // Value from 0 to Q1 (transparent spacer)
  iqr: number; // Value from Q1 to Q3 (visible box)
}

/**
 * Custom tooltip content for box plot
 */
function BoxPlotTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: BoxPlotChartDataPoint }[];
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="bg-background rounded-lg border p-3 shadow-md">
      <p className="mb-2 text-sm font-medium">{data.dateLabel}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Max:</span>
          <span className="font-mono">{data.max.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Q3 (75%):</span>
          <span className="font-mono">{data.q3.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground font-medium">Median:</span>
          <span className="font-mono font-medium">{data.median.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Q1 (25%):</span>
          <span className="font-mono">{data.q1.toFixed(2)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Min:</span>
          <span className="font-mono">{data.min.toFixed(2)}</span>
        </div>
        <hr className="border-border my-1" />
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Data points:</span>
          <span className="font-mono">{data.count}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom bar shape that also renders whiskers
 * Uses the bar's position (which represents Q1 to Q3) to calculate pixel-per-unit scale
 */
interface WhiskerBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: BoxPlotChartDataPoint;
}

function BoxWithWhiskers({ x, y, width, height, payload }: WhiskerBarProps) {
  if (x === undefined || y === undefined || width === undefined || height === undefined || !payload) {
    return null;
  }

  const centerX = x + width / 2;
  const whiskerWidth = width * 0.6;
  const whiskerX = centerX - whiskerWidth / 2;

  // The bar represents the IQR (Q1 to Q3)
  // y is the top of the bar (Q3 position in pixels)
  // y + height is the bottom of the bar (Q1 position in pixels)
  // We can use this to calculate pixels per data unit
  const iqr = payload.q3 - payload.q1;

  // Handle case where IQR is 0 (all values same)
  if (iqr === 0 || height === 0) {
    // Just render a simple box with the median line at center
    const boxHeight = Math.max(height, 8);
    return (
      <g>
        {/* Box */}
        <rect
          x={x}
          y={y - (boxHeight - height) / 2}
          width={width}
          height={boxHeight}
          fill="var(--chart-1)"
          fillOpacity={0.7}
          stroke="var(--chart-1)"
          strokeWidth={2}
          rx={4}
          ry={4}
        />
        {/* Median line */}
        <line x1={x} y1={y} x2={x + width} y2={y} stroke="var(--chart-2)" strokeWidth={3} />
      </g>
    );
  }

  // Calculate pixels per data unit based on the bar dimensions
  const pixelsPerUnit = height / iqr;

  // Calculate whisker positions
  // Q3 is at y (top of bar)
  // Q1 is at y + height (bottom of bar)
  const q3Y = y;
  const q1Y = y + height;

  // Max is above Q3, Min is below Q1
  const maxY = q3Y - (payload.max - payload.q3) * pixelsPerUnit;
  const minY = q1Y + (payload.q1 - payload.min) * pixelsPerUnit;

  // Median is between Q1 and Q3
  const medianY = q3Y + (payload.q3 - payload.median) * pixelsPerUnit;

  return (
    <g>
      {/* Vertical whisker line from min to max */}
      <line
        x1={centerX}
        y1={minY}
        x2={centerX}
        y2={maxY}
        stroke="var(--chart-3)"
        strokeWidth={2}
        strokeDasharray="4 2"
      />

      {/* Min whisker cap (bottom) */}
      <line x1={whiskerX} y1={minY} x2={whiskerX + whiskerWidth} y2={minY} stroke="var(--chart-3)" strokeWidth={2} />

      {/* Max whisker cap (top) */}
      <line x1={whiskerX} y1={maxY} x2={whiskerX + whiskerWidth} y2={maxY} stroke="var(--chart-3)" strokeWidth={2} />

      {/* Box (IQR) */}
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 4)}
        fill="var(--chart-1)"
        fillOpacity={0.7}
        stroke="var(--chart-1)"
        strokeWidth={2}
        rx={4}
        ry={4}
      />

      {/* Median line */}
      <line x1={x} y1={medianY} x2={x + width} y2={medianY} stroke="var(--chart-2)" strokeWidth={3} />
    </g>
  );
}

export function BoxPlotRenderer({ data, options }: BoxPlotRendererProps) {
  const { theme } = useThemeStore();
  const isDark = theme === THEME_DARK;
  const chartRef = useRef<HTMLDivElement>(null);

  // Zoom state
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [left, setLeft] = useState<number | "dataMin">("dataMin");
  const [right, setRight] = useState<number | "dataMax">("dataMax");
  const [isZooming, setIsZooming] = useState(false);

  // Use smaller default bucket size (14 days = 2 weeks) for better granularity
  const bucketSizeInDays = options?.bucketSizeInDays ?? 14;

  // Transform data for box plot visualization
  const chartData = useMemo<BoxPlotChartDataPoint[]>(() => {
    const boxPlotData = createBoxPlotData(data, bucketSizeInDays);

    return boxPlotData.dataPoints.map((point: BoxPlotDataPoint) => ({
      date: point.x,
      dateLabel: new Date(point.x).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      min: point.y[0],
      q1: point.y[1],
      median: point.y[2],
      q3: point.y[3],
      max: point.y[4],
      count: point.count,
      // For stacked bar rendering:
      // base = invisible spacer from 0 to Q1
      // iqr = visible box from Q1 to Q3
      base: point.y[1], // Q1 value (transparent part)
      iqr: point.y[3] - point.y[1], // IQR height (Q3 - Q1)
    }));
  }, [data, bucketSizeInDays]);

  // Calculate Y axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 1];
    const allMins = chartData.map((d) => d.min);
    const allMaxs = chartData.map((d) => d.max);
    const min = Math.min(...allMins);
    const max = Math.max(...allMaxs);
    const padding = (max - min) * 0.1 || 0.5;
    return [Math.max(0, min - padding), max + padding];
  }, [chartData]);

  const resetZoom = useCallback(() => {
    setLeft("dataMin");
    setRight("dataMax");
    setRefAreaLeft(null);
    setRefAreaRight(null);
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

  // Chart config for shadcn chart system
  const chartConfig: ChartConfig = {
    box: {
      label: "Interquartile Range",
      color: "hsl(var(--chart-1))",
    },
    median: {
      label: "Median",
      color: "hsl(var(--chart-2))",
    },
  };

  if (chartData.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No data available for box plot.</div>;
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-2 flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => exportChartAsPNG(chartRef.current, "boxplot")}
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
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom} title="Reset zoom">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Chart */}
      <div ref={chartRef}>
        <ChartContainer config={chartConfig} className="min-h-75 w-full" style={{ height: 300 }}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const timestamp = typeof value === "number" ? value : Number(value);
                return isNaN(timestamp)
                  ? ""
                  : new Date(timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
              }}
              stroke={isDark ? "hsl(var(--muted-foreground))" : undefined}
              fontSize={12}
              domain={[left, right]}
              allowDataOverflow
              type="number"
              scale="time"
            />
            <YAxis
              stroke={isDark ? "hsl(var(--muted-foreground))" : undefined}
              fontSize={12}
              domain={yDomain}
              allowDataOverflow
            />
            <ChartTooltip content={<BoxPlotTooltipContent />} />

            {/* Invisible base bar (spacer from 0 to Q1) */}
            <Bar dataKey="base" stackId="boxplot" fill="transparent" isAnimationActive={false} />

            {/* Visible IQR box (from Q1 to Q3) with custom shape for whiskers */}
            <Bar
              dataKey="iqr"
              stackId="boxplot"
              fill="hsl(var(--chart-1))"
              isAnimationActive={false}
              shape={<BoxWithWhiskers />}
            />

            {/* Zoom selection area */}
            {refAreaLeft && refAreaRight && (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </div>

      {/* Legend */}
      <div className="text-muted-foreground mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="bg-chart-1 h-4 w-4 rounded opacity-70" />
          <span>Interquartile Range (Q1-Q3)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-chart-2 h-1 w-4" />
          <span>Median</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="border-chart-3 w-4 border-t-2 border-dashed" />
          <span>Min/Max Whiskers</span>
        </div>
      </div>
    </div>
  );
}
