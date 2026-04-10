import { PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useRef } from "react";
import { RotateCcw, Download, Clipboard } from "lucide-react";
import { exportChartAsPNG, copyChartToClipboard } from "@/utils/chartExport";

export interface DoughnutChartData {
  data: number[];
  labels: string[];
  colors: string[];
}

export interface DoughnutChartProps {
  chartData: DoughnutChartData;
  height?: number;
  className?: string;
  showLegend?: boolean;
  showDataLabels?: boolean;
}

// Custom label component to show percentages on pie slices
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (entry: any) => {
  const RADIAN = Math.PI / 180;
  const radius = entry.outerRadius + 12;
  const x = entry.cx + radius * Math.cos(-entry.midAngle * RADIAN);
  const y = entry.cy + radius * Math.sin(-entry.midAngle * RADIAN);
  const percent = entry.percent * 100;
  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > entry.cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${percent.toFixed(0)}%`}
    </text>
  );
};

// Custom tooltip component with line break between label and value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const data = payload[0];
    return (
      <div className="bg-background rounded-lg border p-2 shadow-sm">
        <div className="font-medium">{data.name}</div>
        <div className="text-muted-foreground">{data.value.toLocaleString()}</div>
      </div>
    );
  }
  return null;
};

export function DoughnutChart({
  chartData,
  height = 450,
  className,
  showLegend = true,
  showDataLabels = true,
}: DoughnutChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [visibleSegments, setVisibleSegments] = useState<Set<string>>(new Set(chartData.labels));
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const resetChart = useCallback(() => {
    setVisibleSegments(new Set(chartData.labels));
    setHoveredSegment(null);
  }, [chartData.labels]);

  const handleLegendClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      const dataKey = e?.dataKey;
      if (!dataKey || typeof dataKey !== "string") return;

      const newVisible = new Set(visibleSegments);
      if (newVisible.has(e.dataKey)) {
        newVisible.delete(e.dataKey);
      } else {
        newVisible.add(e.dataKey);
      }
      setVisibleSegments(newVisible);
    },
    [visibleSegments]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLegendMouseEnter = useCallback((e: any) => {
    const dataKey = e?.dataKey;
    if (!dataKey || typeof dataKey !== "string") return;
    setHoveredSegment(dataKey);
  }, []);

  const handleLegendMouseLeave = useCallback(() => {
    setHoveredSegment(null);
  }, []);

  // Transform data for Recharts
  const pieData = chartData.labels.map((label) => ({
    name: label,
    value: chartData.data[chartData.labels.indexOf(label)],
    fill: chartData.colors[chartData.labels.indexOf(label)],
  }));

  // Filter only for rendering, but keep all for legend
  const visiblePieData = pieData.filter((item) => visibleSegments.has(item.name));

  // Build config for shadcn chart
  const chartConfig: ChartConfig = {};
  chartData.labels.forEach((label, index) => {
    chartConfig[label] = {
      label,
      color: chartData.colors[index],
    };
  });

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
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetChart} title="Reset">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div ref={chartRef}>
        <ChartContainer config={chartConfig} className={className}>
          <PieChart height={height}>
            <Pie
              data={visiblePieData}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="90%"
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={showDataLabels ? renderLabel : false}
              labelLine={false}
            >
              {visiblePieData.map((entry, index) => {
                const isHovered = hoveredSegment === entry.name;
                const shouldReduceOpacity = hoveredSegment !== null && !isHovered;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    opacity={shouldReduceOpacity ? 0.15 : 1}
                    style={{
                      transition: "opacity 150ms ease-in-out",
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                onClick={handleLegendClick}
                onMouseEnter={handleLegendMouseEnter}
                onMouseLeave={handleLegendMouseLeave}
                wrapperStyle={{ cursor: "pointer", paddingTop: "14px" }}
              />
            )}
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}

// Grid of multiple doughnut charts
export interface DoughnutChartGridProps {
  datasets: DoughnutChartData[];
  className?: string;
}

export function DoughnutChartGrid({ datasets, className }: DoughnutChartGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${className ?? ""}`}>
      {datasets.map((data, index) => (
        <div key={index} className="mx-auto max-w-45">
          <DoughnutChart chartData={data} showLegend={false} />
        </div>
      ))}
    </div>
  );
}
