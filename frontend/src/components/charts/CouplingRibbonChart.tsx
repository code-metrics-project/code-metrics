import { useMemo, useRef, useState } from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Clipboard, Download, RotateCcw } from "lucide-react";
import { copyChartToClipboard, exportChartAsPNG } from "@/utils/chartExport";
import { useI18n } from "@/hooks/useI18n";

export type CouplingRibbonNode = {
  name: string;
  color?: string;
};

export type CouplingRibbonLink = {
  source: number;
  target: number;
  value: number;
  percentage: number;
  fileA: string;
  fileB: string;
  color?: string;
};

export type CouplingRibbonData = {
  nodes: CouplingRibbonNode[];
  links: CouplingRibbonLink[];
};

type CouplingRibbonChartProps = {
  data: CouplingRibbonData;
  height?: number;
};

const FILE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#f43f5e",
];

type SankeyNodePayload = {
  name: string;
  color?: string;
  depth?: number;
  dimmed?: boolean;
  selected?: boolean;
};

type SankeyNodeRenderProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: SankeyNodePayload;
  onToggleFile?: (fileName: string) => void;
};

type SankeyLinkRenderProps = {
  sourceX?: number;
  targetX?: number;
  sourceY?: number;
  targetY?: number;
  sourceControlX?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: {
    value?: number;
    percentage?: number;
    fileA?: string;
    fileB?: string;
    color?: string;
    source?: { name?: string; color?: string };
    target?: { name?: string; color?: string };
    dimmed?: boolean;
    highlighted?: boolean;
    key?: string;
  };
  coChangeLabel?: string;
  percentageLabel?: string;
};

const truncate = (value: string, maxChars = 22) =>
  value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value;

const fileLabel = (path: string) => {
  const parts = path.split("/");
  const leaf = parts[parts.length - 1];
  return leaf || path;
};

const RibbonTooltip = ({
  active,
  payload,
  coChangeLabel,
  percentageLabel,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      value?: number;
      percentage?: number;
      fileA?: string;
      fileB?: string;
      source?: { name?: string };
      target?: { name?: string };
    };
  }>;
  coChangeLabel: string;
  percentageLabel: string;
}) => {
  if (!active || !payload?.length) return null;

  const link = payload[0]?.payload;
  const fileA = link?.fileA ?? link?.source?.name;
  const fileB = link?.fileB ?? link?.target?.name;
  const value = typeof link?.value === "number" ? link.value : 0;
  const percentage = typeof link?.percentage === "number" ? link.percentage : 0;

  if (!fileA || !fileB) return null;

  return (
    <div className="bg-popover text-popover-foreground rounded-md border p-3 text-sm shadow-md">
      <div className="font-semibold">
        {fileA} ↔ {fileB}
      </div>
      <div className="mt-2">
        {coChangeLabel}: {value}
      </div>
      <div>
        {percentageLabel}: {percentage.toFixed(1)}%
      </div>
    </div>
  );
};

const NodeRenderer = ({ x = 0, y = 0, width = 0, height = 0, payload, onToggleFile }: SankeyNodeRenderProps) => {
  const nodeName = payload?.name ?? "";
  const nodeColor = payload?.color ?? "#3b82f6";
  const dimmed = !!payload?.dimmed;
  const selected = !!payload?.selected;
  const labelText = truncate(fileLabel(nodeName), 24);
  const depth = payload?.depth ?? 0;
  const labelY = y + height / 2 + 4;

  let labelX = x + width / 2;
  let textAnchor: "start" | "middle" | "end" = "middle";

  if (depth === 0) {
    labelX = x + width + 6;
    textAnchor = "start";
  }

  if (depth > 0 && x > 600) {
    labelX = x - 6;
    textAnchor = "end";
  }

  const handleClick = () => {
    if (nodeName) {
      onToggleFile?.(nodeName);
    }
  };

  return (
    <g onClick={handleClick} style={{ cursor: "pointer" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={nodeColor}
        fillOpacity={dimmed ? 0.25 : selected ? 1 : 0.95}
        rx={2}
      />
      <text
        x={labelX}
        y={labelY}
        textAnchor={textAnchor}
        className="fill-foreground text-xs font-medium"
        opacity={dimmed ? 0.3 : 1}
      >
        {labelText}
      </text>
      <title>{nodeName}</title>
    </g>
  );
};

const LinkRenderer = ({
  sourceX = 0,
  targetX = 0,
  sourceY = 0,
  targetY = 0,
  sourceControlX = 0,
  targetControlX = 0,
  linkWidth = 1,
  payload,
  coChangeLabel,
  percentageLabel,
}: SankeyLinkRenderProps) => {
  const stroke = payload?.color ?? payload?.source?.color ?? "#94a3b8";
  const path = `M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;
  const dimmed = !!payload?.dimmed;
  const highlighted = !!payload?.highlighted;

  const strokeOpacity = highlighted ? 0.9 : dimmed ? 0.09 : 0.58;
  const strokeWidth = Math.max(1, linkWidth + (highlighted ? 1 : 0));

  const t = 0.5;
  const x =
    (1 - t) ** 3 * sourceX +
    3 * (1 - t) ** 2 * t * sourceControlX +
    3 * (1 - t) * t ** 2 * targetControlX +
    t ** 3 * targetX;
  const y = (1 - t) ** 3 * sourceY + 3 * (1 - t) ** 2 * t * sourceY + 3 * (1 - t) * t ** 2 * targetY + t ** 3 * targetY;

  const canShowLabel = !dimmed && strokeWidth >= 8 && typeof payload?.value === "number";

  return (
    <g>
      <path
        d={path}
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="butt"
      >
        <title>
          {`${payload?.fileA ?? payload?.source?.name ?? ""} ↔ ${payload?.fileB ?? payload?.target?.name ?? ""}\n${coChangeLabel ?? "Co-changes"}: ${payload?.value ?? 0}\n${percentageLabel ?? "Percentage"}: ${(payload?.percentage ?? 0).toFixed?.(1) ?? payload?.percentage ?? 0}%`}
        </title>
      </path>

      {canShowLabel && (
        <text
          x={x}
          y={y + 3}
          textAnchor="middle"
          className="fill-foreground text-[10px] font-semibold"
          stroke="hsl(var(--background))"
          strokeWidth={2}
          paintOrder="stroke"
          pointerEvents="none"
        >
          {payload?.value}
        </text>
      )}
    </g>
  );
};

export function CouplingRibbonChart({ data, height = 360 }: CouplingRibbonChartProps) {
  const { t } = useI18n();
  const chartRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [hoveredLinkKey, setHoveredLinkKey] = useState<string | null>(null);

  const chartData = useMemo<CouplingRibbonData>(() => {
    const nodes = data.nodes.map((node, index) => ({
      ...node,
      color: FILE_COLORS[index % FILE_COLORS.length],
      dimmed: !!selectedFile && node.name !== selectedFile,
      selected: !!selectedFile && node.name === selectedFile,
    }));

    const links = data.links.map((link) => {
      const sourceColor = nodes[link.source]?.color ?? FILE_COLORS[0];
      const sourceName = nodes[link.source]?.name;
      const targetName = nodes[link.target]?.name;
      const isSelected =
        !selectedFile ||
        sourceName === selectedFile ||
        targetName === selectedFile ||
        link.fileA === selectedFile ||
        link.fileB === selectedFile;

      const linkKey = `${sourceName ?? link.fileA}->${targetName ?? link.fileB}`;

      return {
        ...link,
        color: sourceColor,
        dimmed: !isSelected,
        highlighted: hoveredLinkKey === linkKey,
        key: linkKey,
      };
    });

    return { nodes, links };
  }, [data, hoveredLinkKey, selectedFile]);

  if (!data.links.length) {
    return null;
  }

  const toggleSelectedFile = (fileName: string) => {
    setSelectedFile((prev) => (prev === fileName ? null : fileName));
  };

  const resetView = () => {
    setSelectedFile(null);
    setHoveredLinkKey(null);
  };

  return (
    <div className="space-y-3">
      <div className="mb-2 flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => exportChartAsPNG(chartRef.current, "temporal-coupling-ribbon")}
          title={t("components:temporalCoupling.exportPng")}
          aria-label={t("components:temporalCoupling.exportPng")}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => void copyChartToClipboard(chartRef.current)}
          title={t("components:temporalCoupling.copyToClipboard")}
          aria-label={t("components:temporalCoupling.copyToClipboard")}
        >
          <Clipboard className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={resetView}
          title={t("components:temporalCoupling.reset")}
          aria-label={t("components:temporalCoupling.reset")}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div ref={chartRef}>
        <div className="w-full" style={{ height }} data-testid="temporal-coupling-ribbon-chart">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={chartData}
              nodePadding={18}
              nodeWidth={14}
              linkCurvature={0.45}
              iterations={32}
              margin={{ top: 20, right: 40, bottom: 16, left: 40 }}
              node={(props) => (
                <NodeRenderer {...(props as unknown as SankeyNodeRenderProps)} onToggleFile={toggleSelectedFile} />
              )}
              link={(props) => {
                const typed = props as unknown as SankeyLinkRenderProps;
                const key = typed.payload?.key;
                return (
                  <g
                    onMouseEnter={() => key && setHoveredLinkKey(key)}
                    onMouseLeave={() => setHoveredLinkKey(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <LinkRenderer
                      {...typed}
                      coChangeLabel={t("components:temporalCoupling.coChangeCount")}
                      percentageLabel={t("components:temporalCoupling.percentage")}
                    />
                  </g>
                );
              }}
            >
              <Tooltip
                content={
                  <RibbonTooltip
                    coChangeLabel={t("components:temporalCoupling.coChangeCount")}
                    percentageLabel={t("components:temporalCoupling.percentage")}
                  />
                }
              />
            </Sankey>
          </ResponsiveContainer>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {chartData.nodes.map((node) => (
            <button
              key={node.name}
              type="button"
              className="flex cursor-pointer items-center gap-1.5 rounded-sm px-1 py-0.5 text-left"
              style={{ opacity: !selectedFile || selectedFile === node.name ? 1 : 0.45 }}
              title={node.name}
              onClick={() => toggleSelectedFile(node.name)}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
              <span>{truncate(fileLabel(node.name), 28)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
