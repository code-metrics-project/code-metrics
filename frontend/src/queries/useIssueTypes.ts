import { useQuery } from "@tanstack/react-query";
import { WORKLOAD_ISSUE_TYPES } from "@/api/endpoints";
import client from "@/api/client";
import { QUERY_KEYS } from "./keys";

interface IssueTypesResponse {
  workloadId: string;
  issueTypes: string[];
}

async function fetchIssueTypes(workloadId: string): Promise<string[]> {
  const response = await client.get<IssueTypesResponse>(WORKLOAD_ISSUE_TYPES(workloadId));
  return response.data.issueTypes;
}

export function useIssueTypes(workloadId: string | null) {
  return useQuery({
    queryKey: [QUERY_KEYS.ISSUE_TYPES, workloadId],
    queryFn: () => fetchIssueTypes(workloadId!),
    enabled: !!workloadId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
