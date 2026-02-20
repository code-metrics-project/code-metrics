import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { toValue } from "vue";
import { KEYS } from "./keys";
import { fetchSummary } from "@/services/changes";

type ChangesSummaryQueryKey = [string, string[], string[], Date, Date];

async function runQuery({ queryKey }: QueryFunctionContext<ChangesSummaryQueryKey>) {
  const [_key, workloads, repoGroups, startDate, endDate] = queryKey;

  if (!workloads || workloads.length === 0) {
    return "";
  }

  return await fetchSummary(workloads, repoGroups, startDate, endDate);
}

export function useChangesSummary(
  workloads: string[] | Ref<string[]>,
  repoGroups: string[] | Ref<string[]>,
  startDate: Date | Ref<Date>,
  endDate: Date | Ref<Date>,
  enabled: boolean | Ref<boolean> = true,
) {
  return useQuery({
    queryKey: [
      KEYS.CHANGES_SUMMARY,
      toValue(workloads),
      toValue(repoGroups),
      toValue(startDate),
      toValue(endDate),
    ] as ChangesSummaryQueryKey,
    queryFn: runQuery,
    enabled: toValue(enabled) && toValue(workloads).length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes - summaries are expensive to generate
    retry: 1, // Only retry once for AI calls
  });
}
