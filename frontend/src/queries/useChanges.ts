import { useQuery } from "@tanstack/react-query";
import { fetchForDateRange } from "@/services/changes";
import { QUERY_KEYS } from "./keys";

export interface ChangesRequest {
  workloads: string[];
  repoGroups: string[];
  startDate: Date;
  endDate: Date;
}

export function useChanges(request: ChangesRequest, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.CHANGES, request],
    queryFn: () => fetchForDateRange(request.workloads, request.repoGroups, request.startDate, request.endDate),
    enabled,
  });
}
