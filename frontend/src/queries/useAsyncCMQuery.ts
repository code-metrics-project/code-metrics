import { useQuery } from "@tanstack/react-query";
import { pollForResult, submitAsyncQuery } from "@/services/asyncQuery";
import type { RawQuery } from "@/model/query";
import { QUERY_KEYS } from "./keys";

async function executeQueryAsync(query: RawQuery) {
  const { jobId } = await submitAsyncQuery(query);
  return pollForResult(jobId);
}

/**
 * Runs a query via the async query job pipeline, polling until the result is
 * available.
 */
export function useAsyncCMQuery(query: RawQuery, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUERY, query],
    queryFn: () => executeQueryAsync(query),
    enabled,
    retry: false,
  });
}
