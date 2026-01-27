import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import { CODE_HOTSPOTS } from "@/utils/urls";
import axios from "@/utils/axios";
import type { RepoData } from "@/model/vcs";
import type { Ref } from "vue";
import { KEYS } from "./keys";
import { capitalize } from "lodash";
import type { APIError } from "@/model/apiError";

export type { RepoData };

type CodeHotspotsRequest = {
  startDate: string | Ref<string>;
  workload: string | null | Ref<string | null>;
  issueTypes?: string[] | Ref<string[] | undefined>;
};
type CodeHotspotsQueryKey = [string, CodeHotspotsRequest];

async function runQuery({ queryKey }: QueryFunctionContext<CodeHotspotsQueryKey>) {
  const [_key, query] = queryKey;

  const response = await axios.post(CODE_HOTSPOTS, query).catch((e) => {
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

  const hotspots = response.data as RepoData[];

  return hotspots;
}

export function useCodeHotspots(query: CodeHotspotsRequest) {
  return useQuery({
    enabled: false,
    queryKey: [KEYS.CODE_HOTSPOTS, query] as CodeHotspotsQueryKey,
    queryFn: runQuery,
  });
}
