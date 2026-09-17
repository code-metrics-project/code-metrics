import { useQuery } from "@tanstack/react-query";
import { executeQueryAsync } from "@/services/asyncQuery";
import type { RawQuery } from "@/model/query";
import { QUERY_KEYS } from "./keys";

export function useCMQuery(query: RawQuery, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUERY, query],
    queryFn: () => executeQueryAsync(query),
    enabled,
  });
}
