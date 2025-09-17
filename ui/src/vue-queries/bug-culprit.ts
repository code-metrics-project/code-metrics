import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import { BUG_CULPRIT_FILES } from "@/utils/urls";
import axios from "@/utils/axios";
import type { RepoData } from "@/model/vcs";
import type { Ref } from "vue";
import { KEYS } from "./keys";
import { capitalize } from "lodash";
import type { APIError } from "@/model/apiError";

type BugCulpritRequest = {
  range: number | Ref<number>;
  workload: string | null | Ref<string | null>;
};
type BugCulpritQueryKey = [string, BugCulpritRequest];

async function runQuery({ queryKey }: QueryFunctionContext<BugCulpritQueryKey>) {
  const [_key, query] = queryKey;

  const response = await axios.post(BUG_CULPRIT_FILES, query).catch((e) => {
    if (e.response.data) {
      const errorMessages = (e.response.data.errors as APIError)
        .map((error) => {
          console.log(error.console);
          return `${error.title}: ${capitalize(error.detail)}.`;
        })
        .join("\r\n");
      throw new Error(errorMessages);
    }
    throw e;
  });

  const culprits = response.data as RepoData[];

  return culprits;
}

export function useBugCulprit(query: BugCulpritRequest) {
  return useQuery({
    enabled: false,
    queryKey: [KEYS.BUG_CULPRITS, query] as BugCulpritQueryKey,
    queryFn: runQuery,
  });
}
