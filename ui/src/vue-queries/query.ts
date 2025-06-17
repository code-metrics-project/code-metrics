import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import { executeQuery } from "@/services/query";
import type { RawQuery } from "@/model/query";

type CMQueryKey = [string, RawQuery];

function runQuery({ queryKey }: QueryFunctionContext<CMQueryKey>) {
  const [_key, query] = queryKey;
  return executeQuery(query);
}

export function useCMQuery(query: RawQuery) {
  return useQuery({
    queryKey: ["query", query] as CMQueryKey,
    queryFn: runQuery,
  });
}
