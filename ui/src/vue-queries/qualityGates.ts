import { useQuery, type QueryFunctionContext } from "@tanstack/vue-query";
import { QUALITY_GATES } from "@/utils/urls";
import { client } from "@/utils/apiClient";
import type { Ref } from "vue";
import { KEYS } from "./keys";
import type { VariantType } from "@/utils/colours";

export type TPhase = {
  phase: string;
  gates: TQualityGate[];
};

export type TGate = {
  [key: string]: TPhase[];
};

export type TQualityGate = {
  "check-types": string[];
  provider: string;
  phase: "pre-merge";
  config: {
    file: string;
    fileURL: string;
    path: string;
    name: string;
  };
  isRequiredStatusCheck?: boolean;
};

export type TRepo = {
  repo: string;
  repoLink: string;
  services: {
    "service-tag": string;
    "quality-gates": TGate;
  }[];
};

export type TQualityGateManifest = {
  repoGroups: {
    headline: {
      denominator: number;
      missing: number;
      numerator: number;
      variant: VariantType;
    };
    repoGroup: string;
    workloadId: string;
    repos: TRepo[];
  }[];
  workloadId: string;
};

type QualityGatesRequest = {
  workloads: string[] | null | Ref<string[] | null>;
};
type QualityGatesKey = [string, QualityGatesRequest];

async function runQuery({ queryKey }: QueryFunctionContext<QualityGatesKey>) {
  const [_key, query] = queryKey;

  const response = await client.post(QUALITY_GATES, query);

  const culprits = response.data as TQualityGateManifest[];

  return culprits;
}

export function useQualityGates(query: QualityGatesRequest) {
  return useQuery({
    queryKey: [KEYS.QUALITY_GATES, query] as QualityGatesKey,
    queryFn: runQuery,
  });
}
