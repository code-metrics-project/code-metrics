import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import { WORKLOAD_ISSUE_TYPES } from "@/utils/urls";
import { client } from "@/utils/apiClient";
import type { Ref } from "vue";
import { KEYS } from "./keys";
import { toValue } from "vue";

type IssueTypesResponse = {
  workloadId: string;
  issueTypes: string[];
};

type IssueTypesQueryKey = [string, string | null];

async function runQuery({ queryKey }: QueryFunctionContext<IssueTypesQueryKey>) {
  const [_key, workloadId] = queryKey;

  if (!workloadId) {
    return [];
  }

  const response = await client.get<IssueTypesResponse>(WORKLOAD_ISSUE_TYPES(workloadId));
  return response.data.issueTypes;
}

export function useIssueTypes(workloadId: string | null | Ref<string | null>) {
  return useQuery({
    queryKey: [KEYS.ISSUE_TYPES, toValue(workloadId)] as IssueTypesQueryKey,
    queryFn: runQuery,
    enabled: !!toValue(workloadId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
