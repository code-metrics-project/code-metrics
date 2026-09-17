import { listJobGroups, listWorkloadIds } from "@/config";
import type { DatedMetrics } from "@/model/metrics";
import type { RawQuery } from "@/model/query";
import { Paths } from "@/router/paths";
import { getColourForKey } from "@/utils/colours";
import { buildPath } from "@/utils/path";
import type { DoughnutChartData } from "@/components/charts";

export const PIPELINE_RUNS_QUERY_NAME = "pipeline-runs";

export interface PipelineHealthOutcome {
  key: string;
  success: number;
  chartData: DoughnutChartData;
  runsUrl: string | null;
}

export interface PipelineRunUrlContext {
  stageId?: string | null;
  branchName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Resolve the workloads to query for. An empty selection or the special "all"
 * value expands to every configured workload.
 */
export function expandWorkloads(workloads: string[] | undefined): string[] {
  if (workloads && workloads.length > 0 && !(workloads.length === 1 && workloads[0] === "all")) {
    return workloads;
  }
  return listWorkloadIds();
}

/**
 * Resolve the job groups to query for. An empty selection expands to every
 * configured job group.
 */
export function expandJobGroups(jobGroups: string[] | undefined): string[] {
  if (jobGroups && jobGroups.length > 0) {
    return jobGroups;
  }
  return listJobGroups();
}

/**
 * Split the shared query args into one pipeline-runs query per workload and job group.
 */
export function splitPipelineRunQueries(args: Record<string, unknown>): RawQuery[] {
  const workloads = expandWorkloads(args.workloads as string[] | undefined);
  const jobGroups = expandJobGroups(args.jobGroups as string[] | undefined);
  const queries: RawQuery[] = [];
  for (const workload of workloads) {
    for (const jobGroup of jobGroups) {
      queries.push({
        queryName: PIPELINE_RUNS_QUERY_NAME,
        args: {
          ...args,
          workloads: [workload],
          jobGroups: [jobGroup],
        },
      });
    }
  }
  return queries;
}

function tagGroupDimension(tag: string): string {
  return tag.includes("/") ? tag.split("/")[1] : "all";
}

/**
 * Calculate the percentage that each metric tag (e.g. "runs-successful/athena")
 * contributes within its group dimension (e.g. "athena"), replicating the
 * legacy calculatePercentageByTag behaviour.
 */
export function calculateRunPercentages(data: Map<string, DatedMetrics>): Map<string, number> {
  const tagTotals: Record<string, number> = {};
  const groupTotals: Record<string, number> = {};

  for (const datedMetrics of data.values()) {
    for (const [tag, entry] of datedMetrics.entries.entries()) {
      tagTotals[tag] = (tagTotals[tag] ?? 0) + entry.value;
      const group = tagGroupDimension(tag);
      groupTotals[group] = (groupTotals[group] ?? 0) + entry.value;
    }
  }

  const percentages = new Map<string, number>();
  for (const [tag, total] of Object.entries(tagTotals)) {
    const groupTotal = groupTotals[tagGroupDimension(tag)] ?? 0;
    percentages.set(tag, groupTotal > 0 ? Math.round((total / groupTotal) * 1000) / 10 : 0);
  }
  return percentages;
}

/**
 * Build doughnut chart data (labels, values, colours) from per-tag values.
 */
export function toDoughnutChartData(values: Map<string, number>): DoughnutChartData {
  const labels = [...values.keys()];
  return {
    data: [...values.values()],
    labels,
    colors: labels.map((label, index) => getColourForKey(label, index)),
  };
}

/**
 * Extract the success percentage: the value of the first label whose axis
 * (the part before "/") ends with "-successful". Zero when absent.
 */
export function extractSuccessPercent(labels: string[], values: number[]): number {
  for (let i = 0; i < labels.length; i++) {
    const axisName = labels[i].split("/")[0];
    if (axisName.endsWith("-successful")) {
      return values[i];
    }
  }
  return 0;
}

/**
 * Build the URL to the pipeline runs page with the filters of the executed query.
 */
export function buildRunsUrl(workloadId: string, jobGroup: string, context: PipelineRunUrlContext): string {
  return buildPath(Paths.WorkloadPipelineRuns, {
    executeImmediately: "true",
    workloadId,
    stageId: context.stageId,
    branchName: context.branchName,
    jobGroup,
    startDate: context.startDate,
    endDate: context.endDate,
  });
}

/**
 * Transform a single workload/job group pipeline-runs result into an outcome.
 * Returns null when the result holds no data (mirrors the legacy behaviour).
 */
export function outcomeFromResult(
  workloadId: string,
  jobGroup: string,
  result: Map<string, DatedMetrics> | undefined,
  context: PipelineRunUrlContext
): PipelineHealthOutcome | null {
  if (!result || result.size === 0) {
    return null;
  }
  const chartData = toDoughnutChartData(calculateRunPercentages(result));
  return {
    key: `${workloadId}-${jobGroup}`,
    success: extractSuccessPercent(chartData.labels, chartData.data),
    chartData,
    runsUrl: buildRunsUrl(workloadId, jobGroup, context),
  };
}
