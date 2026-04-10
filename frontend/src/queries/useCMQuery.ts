import { useQuery } from "@tanstack/react-query";
import { executeQuery } from "@/services/query";
import type { RawQuery } from "@/model/query";
import { QUERY_KEYS } from "./keys";

export function useCMQuery(query: RawQuery, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUERY, query],
    queryFn: () => executeQuery(query),
    enabled,
  });
}
