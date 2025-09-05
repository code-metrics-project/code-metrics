import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import { QUALITY_GATES } from "@/utils/urls";
import axios from "@/utils/axios";
import type { Ref } from "vue";
import { KEYS } from "./keys";

export type TQualityGate = {
  "check-types": string[];
  provider: string;
  phase: "pre-merge";
  config: {
    file: string;
    path: string;
    name: string;
  };
  isRequiredStatusCheck?: boolean;
};

export type TQualityGateManifest = {
  $schema: string;
  repo?: string;
  repoLink?: string;
  services: {
    "service-tag": string;
    "quality-gates": TQualityGate[];
  }[];
};

type QualityGatesRequest = {
  workloads: string[] | null | Ref<string[] | null>;
};
type QualityGatesKey = [string, QualityGatesRequest];

async function runQuery({ queryKey }: QueryFunctionContext<QualityGatesKey>) {
  const [_key, query] = queryKey;

  const response = await axios.post(QUALITY_GATES, query);

  const culprits = response.data as TQualityGateManifest[];

  return culprits;
}

export function useQualityGates(query: QualityGatesRequest) {
  return useQuery({
    queryKey: [KEYS.QUALITY_GATES, query] as QualityGatesKey,
    queryFn: runQuery,
  });
}
