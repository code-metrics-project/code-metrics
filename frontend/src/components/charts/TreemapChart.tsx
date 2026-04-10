import { useState, useMemo, useCallback } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { useThemeStore } from "@/store/theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Flame, Shield } from "lucide-react";

export interface IssueLink {
  id: string;
  url: string;
}

export interface TreemapDataItem {
  x: string;
  y: number;
  meta?: {
    fullPath?: string;
    coverage?: string;
    issueIds?: string[];
    issueLinks?: IssueLink[];
  };
}

export interface TreemapSeriesItem {
  name: string;
  data: TreemapDataItem[];
}

export interface TreemapChartProps {
  series: TreemapSeriesItem[];
  height?: number | `${number}%`;
}

// Recharts treemap needs data in a different format
interface RechartsTreemapNode {
  name: string;
  size: number;
  children?: RechartsTreemapNode[];
  meta?: TreemapDataItem["meta"];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: RechartsTreemapNode }[] }) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const coverage = data.meta?.coverage || "N/A";
  const issueCount = data.meta?.issueLinks?.length || 0;

  return (
    <div className="bg-popover text-popover-foreground rounded-md border p-3 text-sm shadow-md">
      <div className="font-semibold">{data.name}</div>
      {data.meta?.fullPath && (
        <div className="text-muted-foreground mt-1 max-w-xs text-xs break-all">{data.meta.fullPath}</div>
      )}
      <div className="mt-2">
        <strong>{data.size}</strong> issue-related changes
      </div>
      <div className="mt-1">Coverage: {coverage}</div>
      <div className="mt-1">
        {issueCount} linked issue{issueCount !== 1 ? "s" : ""}
      </div>
      <div className="text-primary mt-2 text-xs">Click to view issue links</div>
    </div>
  );
};

export function TreemapChart({ series, height = 400 }: TreemapChartProps) {
  const { theme } = useThemeStore();
  const isDark = theme === "dark";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<{
    name: string;
    size: number;
    meta?: TreemapDataItem["meta"];
  } | null>(null);

  // Transform series data to Recharts format
  const treemapData = useMemo(() => {
    if (!series || series.length === 0) return [];

    // Flatten all data items into a single array
    const allData: RechartsTreemapNode[] = [];
    for (const s of series) {
      for (const item of s.data) {
        allData.push({
          name: item.x,
          size: item.y,
          meta: item.meta,
        });
      }
    }

    return allData;
  }, [series]);

  const maxValue = useMemo(() => {
    return Math.max(...treemapData.map((d) => d.size), 1);
  }, [treemapData]);

  // Calculate color based on value - 3-tier criticality scale matching Vue
  // Low (0-33%) -> Amber/Gold, Medium (33-66%) -> Deep Orange, High (66-100%) -> Red
  const getColor = (value: number, maxValue: number) => {
    const ratio = value / maxValue;

    if (ratio <= 0.33) return "#F9A825"; // Amber/Gold - low criticality
    if (ratio <= 0.66) return "#FF7043"; // Deep Orange - medium criticality
    return "#D32F2F"; // Red - high criticality
  };

  const CustomizedContent = useCallback(
    function TreemapChartContent(props: {
      x: number;
      y: number;
      width: number;
      height: number;
      name: string;
      value: number;
    }) {
      const { x, y, width, height, name, value } = props;
      const size = value;

      // Skip rendering if tile is too small for any content
      if (!name || width < 2 || height < 2) return <g />;

      const color = getColor(size, maxValue);
      const dataItem = treemapData.find((d) => d.name === name);
      const coverage = dataItem?.meta?.coverage;

      // Determine if text should be rotated (tall narrow tiles)
      const isNarrow = width < 50 && height > width * 1.5;
      const effectiveWidth = isNarrow ? height : width;
      const effectiveHeight = isNarrow ? width : height;

      // Calculate available space for text
      const minSizeForText = 30;
      const canShowText = effectiveWidth >= minSizeForText && effectiveHeight >= 20;
      const canShowChanges = canShowText && effectiveHeight >= 35;
      const canShowCoverage = canShowChanges && effectiveHeight >= 50 && coverage;

      // Truncate name based on available width
      const maxChars = Math.floor(effectiveWidth / 7);
      const displayName = name.length > maxChars ? name.substring(0, maxChars - 2) + "…" : name;

      // Calculate font size based on tile size
      const fontSize = Math.min(12, Math.max(9, effectiveWidth / 8));

      const handleClick = () => {
        if (dataItem) {
          setSelectedData(dataItem);
          setDialogOpen(true);
        }
      };

      // Border styling
      const borderWidth = 1;
      const borderColor = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";

      return (
        <g>
          {/* Main tile rectangle */}
          <rect
            x={x + borderWidth / 2}
            y={y + borderWidth / 2}
            width={Math.max(0, width - borderWidth)}
            height={Math.max(0, height - borderWidth)}
            style={{
              fill: color,
              stroke: borderColor,
              strokeWidth: borderWidth,
              cursor: "pointer",
            }}
            onClick={handleClick}
          />

          {/* Text content */}
          {canShowText && (
            <g
              transform={
                isNarrow
                  ? `translate(${x + width / 2}, ${y + height / 2}) rotate(-90)`
                  : `translate(${x + width / 2}, ${y + height / 2})`
              }
              style={{ pointerEvents: "none" }}
            >
              {/* File name */}
              <text
                x={0}
                y={canShowCoverage ? -fontSize : canShowChanges ? -fontSize / 2 : fontSize / 3}
                textAnchor="middle"
                fill="#fff"
                fontSize={fontSize}
                fontWeight="500"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
              >
                {displayName}
              </text>

              {/* Changes count */}
              {canShowChanges && (
                <text
                  x={0}
                  y={canShowCoverage ? 2 : fontSize / 2 + 2}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={fontSize - 1}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                >
                  Changes: {size}
                </text>
              )}

              {/* Coverage */}
              {canShowCoverage && (
                <text
                  x={0}
                  y={fontSize + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={fontSize - 1}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                >
                  Coverage: {coverage}
                </text>
              )}
            </g>
          )}
        </g>
      );
    },
    [treemapData, maxValue, isDark, setSelectedData, setDialogOpen]
  );

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={treemapData}
          dataKey="size"
          stroke={isDark ? "hsl(var(--border))" : "hsl(var(--border))"}
          fill="hsl(var(--chart-1))"
          content={CustomizedContent}
          isAnimationActive={false}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>

      {/* Dialog for showing issue links */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedData?.name}</DialogTitle>
            {selectedData?.meta?.fullPath && (
              <DialogDescription className="text-xs break-all">{selectedData.meta.fullPath}</DialogDescription>
            )}
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>
                <strong>{selectedData?.size}</strong> issue-related changes
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>
                <strong>Coverage:</strong> {selectedData?.meta?.coverage || "-"}
              </span>
            </div>

            <Separator />

            <div>
              <h4 className="mb-2 text-sm font-medium">Related Issues</h4>
              {selectedData?.meta?.issueLinks?.length ? (
                <div className="max-h-[40vh] space-y-1 overflow-y-auto pr-2">
                  {selectedData.meta.issueLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:bg-muted text-primary flex items-center gap-2 rounded-md p-2 text-sm transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.id}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No linked issues</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
