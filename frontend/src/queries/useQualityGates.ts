import { useQuery } from "@tanstack/react-query";
import { QUALITY_GATES } from "@/api/endpoints";
import client from "@/api/client";
import { QUERY_KEYS } from "./keys";
import type { VariantType } from "@/utils/colours";

export interface TPhase {
  phase: string;
  gates: TQualityGate[];
}

export type TGate = Record<string, TPhase[]>;

export interface TQualityGate {
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
}

export interface TRepo {
  repo: string;
  repoLink: string;
  services: {
    "service-tag": string;
    "quality-gates": TGate;
  }[];
}

export interface TQualityGateManifest {
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
}

export interface QualityGatesRequest {
  workloads: string[] | null;
}

async function fetchQualityGates(query: QualityGatesRequest): Promise<TQualityGateManifest[]> {
  const response = await client.post<TQualityGateManifest[]>(QUALITY_GATES, query);
  return response.data;
}

export function useQualityGates(query: QualityGatesRequest, enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.QUALITY_GATES, query],
    queryFn: () => fetchQualityGates(query),
    enabled: enabled && query.workloads !== null,
  });
}
