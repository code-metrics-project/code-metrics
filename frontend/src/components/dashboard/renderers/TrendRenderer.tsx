import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DatedMetrics } from "@/model/metrics";
import { calculateRollingAverages } from "@/utils/rollingAverages";
import { cn } from "@/lib/utils";

interface TrendRendererProps {
  data: Map<string, DatedMetrics>;
  options?: Record<string, unknown>;
}

interface TrendPeriod {
  name: string;
  endDate: string;
  value: number;
  change: number;
}

interface SeriesTotal {
  key: string;
  label: string;
  value: number;
  indicatorClass: string;
}

const PIPELINE_STATE_ORDER = ["runs-successful", "runs-aborted", "runs-failed"];

const normaliseSeriesKey = (key: string): string => {
  const base = key.split("/")[0];
  if (base.includes("runs-successful")) return "runs-successful";
  if (base.includes("runs-aborted")) return "runs-aborted";
  if (base.includes("runs-failed")) return "runs-failed";
  return base;
};

const formatSeriesLabel = (key: string): string => {
  if (key === "runs-successful") return "Success";
  if (key === "runs-aborted") return "Aborted";
  if (key === "runs-failed") return "Failed";
  return key
    .replace(/^runs-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getSeriesIndicatorClass = (key: string): string => {
  if (key === "runs-successful") return "bg-green-500";
  if (key === "runs-aborted") return "bg-orange-500";
  if (key === "runs-failed") return "bg-red-500";
  return "bg-muted-foreground";
};

const formatMetricValue = (metricName: string, value: number): string => {
  if (metricName.includes("coverage")) {
    return `${value.toFixed(1)}%`;
  }
  if (metricName.includes("bug")) {
    return `${Math.round(value)}`;
  }
  return `${Math.round(value * 100) / 100}`;
};

const formatMetricChange = (metricName: string, value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  if (metricName.includes("coverage")) {
    return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
  }
  return `${rounded > 0 ? "+" : ""}${rounded}`;
};

export function TrendRenderer({ data }: TrendRendererProps) {
  const latestDate = useMemo(() => {
    if (data.size === 0) {
      return null;
    }
    return Array.from(data.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [data]);

  const seriesTotals = useMemo<SeriesTotal[]>(() => {
    const totals = new Map<string, number>();

    for (const metric of data.values()) {
      for (const [seriesKey, entry] of metric.entries.entries()) {
        const normalisedKey = normaliseSeriesKey(seriesKey);
        totals.set(normalisedKey, (totals.get(normalisedKey) ?? 0) + (entry?.value ?? 0));
      }
    }

    if (totals.size <= 1) {
      return [];
    }

    return Array.from(totals.entries())
      .sort(([a], [b]) => {
        const ai = PIPELINE_STATE_ORDER.indexOf(a);
        const bi = PIPELINE_STATE_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
      .map(([key, value]) => ({
        key,
        label: formatSeriesLabel(key),
        value: Math.round(value),
        indicatorClass: getSeriesIndicatorClass(key),
      }));
  }, [data]);

  const formattedData = useMemo<TrendPeriod[]>(() => {
    const BUCKET_SIZE = 7;
    const averages = calculateRollingAverages(data, BUCKET_SIZE);

    // Get first 4 items (most recent), sorted by date descending
    const sortedItems = Array.from(averages.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, 4);

    // Format for UI - filter out empty entries
    const formattedForUI = sortedItems
      .filter(([, metric]) => metric.entries.size > 0)
      .map(([dateStr, metric]) => {
        // Get first entry from the metric
        const firstEntry = metric.entries.entries().next().value;
        if (!firstEntry) return null;

        const [name, entryData] = firstEntry as [string, { date: string; value: number }];

        // Handle both object format and direct number
        const value =
          typeof entryData === "object" && entryData !== null ? entryData.value : (entryData as unknown as number);

        return {
          name,
          endDate: dateStr,
          value: typeof value === "number" && !isNaN(value) ? value : 0,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && !isNaN(item.value))
      .reverse() // Reverse to chronological order (oldest to newest)
      .map((item, index, arr) => ({
        ...item,
        change: index !== 0 ? item.value - arr[index - 1].value : 0,
      }));

    return formattedForUI;
  }, [data]);

  if (formattedData.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">No data available.</div>;
  }

  if (seriesTotals.length > 0) {
    return (
      <div>
        {latestDate && (
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
            Week ending{" "}
            {new Date(latestDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {seriesTotals.map((series) => (
            <div key={series.key} className="bg-muted/50 border-border/50 rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", series.indicatorClass)} />
                <p className="text-muted-foreground truncate text-xs font-medium tracking-wide uppercase">
                  {series.label}
                </p>
              </div>
              <p className="text-foreground mt-1 text-xl leading-tight font-bold sm:text-2xl">{series.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">Week ending</p>
      <div className="flex gap-2">
        {formattedData.map((period, index) => {
          const isLatest = index === formattedData.length - 1;

          return (
            <div
              key={period.endDate}
              className={cn(
                "min-w-0 flex-1 rounded-xl p-3 transition-all duration-200",
                isLatest
                  ? "bg-primary/10 border-primary/30 border-2 shadow-sm"
                  : "bg-muted/50 border-border/50 hover:bg-muted border"
              )}
            >
              <p className={cn("mb-2 text-xs font-medium", isLatest ? "text-primary" : "text-muted-foreground")}>
                {new Date(period.endDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium",
                      period.change > 0
                        ? "bg-green-500/10 text-green-600 dark:text-green-400"
                        : period.change < 0
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    )}
                  >
                    {period.change > 0 && <TrendingUp className="h-3 w-3" />}
                    {period.change < 0 && <TrendingDown className="h-3 w-3" />}
                    {period.change === 0 && <Minus className="h-3 w-3" />}
                    {formatMetricChange(period.name, period.change)}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "mt-1 text-base leading-tight font-bold sm:text-lg",
                  isLatest ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {formatMetricValue(period.name, period.value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
