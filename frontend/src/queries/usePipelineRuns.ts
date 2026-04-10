import { useQuery } from "@tanstack/react-query";
import { fetchForDateRange } from "@/services/pipelines";
import { QUERY_KEYS } from "./keys";

export interface PipelineRunsRequest {
  workloads: string[];
  stageId: string;
  jobGroups: string[];
  branch: string;
  startDate: Date;
  endDate: Date;
}

export function usePipelineRuns(request: PipelineRunsRequest, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.PIPELINE_RUNS, request],
    queryFn: () =>
      fetchForDateRange(
        request.workloads,
        request.stageId,
        request.jobGroups,
        request.branch,
        request.startDate,
        request.endDate
      ),
    enabled,
  });
}
