import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import { executeQuery } from "@/services/query";
import type { RawQuery } from "@/model/query";
import { KEYS } from "./keys";

type CMQueryKey = [string, RawQuery];

function runQuery({ queryKey }: QueryFunctionContext<CMQueryKey>) {
  const [_key, query] = queryKey;
  return executeQuery(query);
}

export function useCMQuery(query: RawQuery) {
  return useQuery({
    queryKey: [KEYS.QUERY, query] as CMQueryKey,
    queryFn: runQuery,
  });
}
