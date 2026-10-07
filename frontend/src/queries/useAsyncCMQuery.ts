import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/services/queryDispatcher";
import type { RawQuery } from "@/model/query";
import { QUERY_KEYS } from "./keys";

/**
 * Runs a query via the async query job pipeline, polling until the result is
 * available.  Falls back to the synchronous query endpoint when the async
 * feature is disabled on the backend.
 */
export function useAsyncCMQuery(query: RawQuery, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUERY, query],
    queryFn: () => executeQuery(query),
    enabled,
    retry: false,
  });
}
