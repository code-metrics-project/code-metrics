import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import { BUG_CULPRIT_FILES } from "@/utils/urls";
import axios from "@/utils/axios";
import type { RepoData } from "@/model/vcs";
import type { Ref } from "vue";

type BugCulpritRequest = {
  daysBack: number | Ref<number>;
  workload: string | null | Ref<string | null>;
};
type BugCulpritQueryKey = [string, BugCulpritRequest];

async function runQuery({ queryKey }: QueryFunctionContext<BugCulpritQueryKey>) {
  const [_key, query] = queryKey;

  const response = await axios.post(BUG_CULPRIT_FILES, query);

  const culprits = response.data as RepoData[];

  return culprits;
}

export function useBugCulprit(query: BugCulpritRequest) {
  return useQuery({
    enabled: false,
    queryKey: ["bug-culprit", query] as BugCulpritQueryKey,
    queryFn: runQuery,
  });
}
