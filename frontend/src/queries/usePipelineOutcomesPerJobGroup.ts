import { useQueries } from "@tanstack/react-query";
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

function transformToOutcome(
  data: Map<string, { entries: Map<string, { value: number }> }> | undefined,
  labelKey: string,
  groupName: string,
  args: Record<string, unknown>
): PipelineOutcome | null {
  if (!data || data.size === 0) return null;

  const metricTotals = new Map<string, number>();

  for (const [, datedMetrics] of data.entries()) {
    for (const [metricKey, metricEntry] of datedMetrics.entries.entries()) {
      const currentTotal = metricTotals.get(metricKey) ?? 0;
      metricTotals.set(metricKey, currentTotal + metricEntry.value);
    }
  }

  const labels = Array.from(metricTotals.keys());
  const values = Array.from(metricTotals.values());
  const total = values.reduce((sum, val) => sum + val, 0);

  const colors = labels.map((label) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes("success") || lowerLabel.includes("passed")) return "#22c55e";
    if (lowerLabel.includes("failed") || lowerLabel.includes("failure")) return "#ef4444";
    if (lowerLabel.includes("aborted") || lowerLabel.includes("abort")) return "#f97316";
    const fallbackPalette = ["#3b82f6", "#8b5cf6", "#eab308", "#06b6d4", "#ec4899"];
    const index = labels.indexOf(label);
    return fallbackPalette[index % fallbackPalette.length];
  });

  const successKey = labels.find(
    (key) => key.toLowerCase().includes("success") || key.toLowerCase().includes("passed")
  );
  const successValue = successKey ? (metricTotals.get(successKey) ?? 0) : 0;
  const successRate = total > 0 ? (successValue / total) * 100 : 0;

  // Build runsUrl with all relevant filter parameters
  let runsUrl: string | null = null;
  if (args.workloads && Array.isArray(args.workloads) && args.workloads.length > 0) {
    const params = new URLSearchParams();

    // Always set executeImmediately for convenience
    params.append("executeImmediately", "true");

    // Workload (required)
    const workloadId = (args.workloads as string[])[0];
    params.append("workloadId", workloadId);

    // Job group (if specific group, not "All Jobs")
    if (groupName !== "All Jobs") {
      params.append("jobGroup", groupName);
    }

    // Stage
    if (args.stageId && typeof args.stageId === "string") {
      params.append("stageId", args.stageId);
    }

    // Branch name (take first if array)
    if (args.branchNames && Array.isArray(args.branchNames) && args.branchNames.length > 0) {
      params.append("branchName", (args.branchNames as string[])[0]);
    }

    // Date range
    if (args.startDate) {
      params.append("startDate", args.startDate.toString());
    }
    if (args.endDate) {
      params.append("endDate", args.endDate.toString());
    }

    runsUrl = `${Paths.WorkloadPipelineRuns}?${params.toString()}`;
  }

  return {
    key: labelKey,
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
    runsUrl,
  };
}

export function usePipelineOutcomesPerJobGroup(args: Record<string, unknown>, enabled = true, workloadKey?: string) {
  const jobGroups: string[] = Array.isArray(args.jobGroups) ? (args.jobGroups as string[]) : [];
  const groups = jobGroups.length > 0 ? jobGroups : ["All Jobs"];

  const queryResults = useQueries({
    queries: groups.map((group) => {
      const groupArgs = { ...args } as Record<string, unknown>;
      if (group !== "All Jobs") {
        groupArgs.jobGroups = [group];
      } else {
        // Ensure we don't filter by jobGroups for the "All Jobs" query
        delete groupArgs.jobGroups;
      }

      const query: RawQuery = {
        queryName: "pipeline-runs",
        args: groupArgs,
      };

      return {
        queryKey: [QUERY_KEYS.PIPELINE_RUNS, "outcomes", workloadKey || "all", group, groupArgs],
        queryFn: () => executeQuery(query),
        enabled,
      };
    }),
  });

  const isLoading = queryResults.some((r) => r.isLoading);
  const isError = queryResults.some((r) => r.isError);
  const error = queryResults.find((r) => r.error)?.error;

  const data: PipelineOutcome[] = queryResults
    .map((r, idx) =>
      transformToOutcome(
        r.data as Map<string, { entries: Map<string, { value: number }> }> | undefined,
        groups[idx],
        groups[idx],
        args
      )
    )
    .filter((o): o is PipelineOutcome => o !== null);

  return { data, isLoading, isError, error };
}
