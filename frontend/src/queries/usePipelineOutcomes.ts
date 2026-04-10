import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/services/query";
import { Paths } from "@/router/paths";
import type { RawQuery } from "@/model/query";
import { QUERY_KEYS } from "./keys";

export interface PipelineOutcome {
  key: string;
  success: number;
  failure: number;
  total: number;
  chartData: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
    }[];
  };
  runsUrl: string | null;
}

export function usePipelineOutcomes(args: Record<string, unknown>, enabled = true, workloadKey?: string) {
  const query: RawQuery = {
    queryName: "pipeline-runs",
    args,
  };

  return useQuery({
    queryKey: [QUERY_KEYS.PIPELINE_RUNS, "outcomes", workloadKey || "all", args],
    queryFn: () => executeQuery(query),
    enabled,
    select: (data) => {
      // Transform raw pipeline data (Map<date, DatedMetrics>) into a single consolidated outcome
      if (!data || data.size === 0) return [];

      // Dynamically aggregate all metrics by name, regardless of what they are
      const metricTotals = new Map<string, number>();

      // Iterate through all dates and their metrics
      for (const [, datedMetrics] of data.entries()) {
        // Each datedMetrics has an entries Map<metricName, MetricEntry>
        for (const [metricKey, metricEntry] of datedMetrics.entries.entries()) {
          // Aggregate by metric name
          const currentTotal = metricTotals.get(metricKey) ?? 0;
          metricTotals.set(metricKey, currentTotal + metricEntry.value);
        }
      }

      // Convert to arrays for chart rendering
      const labels = Array.from(metricTotals.keys());
      const values = Array.from(metricTotals.values());
      const total = values.reduce((sum, val) => sum + val, 0);

      // Assign colors intelligently based on metric name content
      const colors = labels.map((label) => {
        const lowerLabel = label.toLowerCase();

        // Green for success/successful/passed
        if (lowerLabel.includes("success") || lowerLabel.includes("passed")) {
          return "#22c55e"; // green-500
        }
        // Red for failed/failure
        if (lowerLabel.includes("failed") || lowerLabel.includes("failure")) {
          return "#ef4444"; // red-500
        }
        // Orange for aborted/abort
        if (lowerLabel.includes("aborted") || lowerLabel.includes("abort")) {
          return "#f97316"; // orange-500
        }

        // Fallback colors for any other metrics
        const fallbackPalette = ["#3b82f6", "#8b5cf6", "#eab308", "#06b6d4", "#ec4899"];
        const index = labels.indexOf(label);
        return fallbackPalette[index % fallbackPalette.length];
      });

      // Calculate success rate (assume first metric with "success" in name is success rate)
      const successKey = labels.find(
        (key) => key.toLowerCase().includes("success") || key.toLowerCase().includes("passed")
      );
      const successValue = successKey ? (metricTotals.get(successKey) ?? 0) : 0;
      const successRate = total > 0 ? (successValue / total) * 100 : 0;

      // Return a single consolidated outcome with dynamic metrics
      return [
        {
          key: "Pipeline Health",
          success: successRate,
          failure: 100 - successRate,
          total,
          chartData: {
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: colors,
              },
            ],
          },
          runsUrl:
            args.workloads && Array.isArray(args.workloads) && args.workloads.length > 0
              ? `${Paths.WorkloadPipelineRuns}?workloadId=${args.workloads[0]}`
              : null,
        },
      ];
    },
  });
}
