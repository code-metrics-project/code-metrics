import { useQuery } from "@tanstack/react-query";
import { fetchSummary, type ChangesSummaryResponse } from "@/services/changes";
import { truncateDateOnly } from "@/utils/date";
import { QUERY_KEYS } from "./keys";

export interface ChangesSummaryRequest {
  workloads: string[];
  repoGroups: string[];
  startDate: Date;
  endDate: Date;
  language?: string;
}

type NormalizedChangesSummaryRequest = {
  workloads: string[];
  repoGroups: string[];
  startDate: string;
  endDate: string;
  language?: string;
};

function normalizeRequest(request: ChangesSummaryRequest): NormalizedChangesSummaryRequest {
  return {
    workloads: [...new Set(request.workloads)].sort(),
    repoGroups: [...new Set(request.repoGroups)].sort(),
    startDate: truncateDateOnly(request.startDate),
    endDate: truncateDateOnly(request.endDate),
    language: request.language,
  };
}

export function getChangesSummaryQueryKey(request: ChangesSummaryRequest) {
  return [QUERY_KEYS.CHANGES_SUMMARY, normalizeRequest(request)] as const;
}

export function createChangesSummaryQueryOptions(request: ChangesSummaryRequest) {
  const normalized = normalizeRequest(request);

  return {
    queryKey: [QUERY_KEYS.CHANGES_SUMMARY, normalized] as const,
    queryFn: () =>
      fetchSummary(
        normalized.workloads,
        normalized.repoGroups,
        new Date(normalized.startDate),
        new Date(normalized.endDate),
        normalized.language
      ),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  };
}

export function useChangesSummary(request: ChangesSummaryRequest, enabled = true) {
  return useQuery({
    ...createChangesSummaryQueryOptions(request),
    enabled: enabled && request.workloads.length > 0,
  });
}

export type { ChangesSummaryResponse };
