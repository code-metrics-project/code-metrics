export type TQualityGate = {
  "check-types": string[];
  provider: string;
  phase: "pre-merge";
  config: {
    file: string;
    fileURL?: string;
    path: string;
    name: string;
  };
  isRequiredStatusCheck?: boolean;
};
export type TQualityGateManifest = {
  $schema?: string;
  repo?: string;
  repoLink?: string;
  services: {
    "service-tag": string;
    "quality-gates": TQualityGate[];
  }[];
};
type TPhase = {
  phase: string;
  gates: TQualityGate[];
};
export type TGate = {
  [key: string]: TPhase[];
};
export type TQualityGateOutput = {
  $schema?: string;
  repo?: string;
  repoGroup?: string;
  repoLink?: string;
  services?: {
    "service-tag": string;
    "quality-gates": TGate;
  }[];
  workloadId?: string;
};
export type TMergeRules = {
  id: number;
  name: string;
};
export type TRepoGroupQualityGates = {
  headline: {
    denominator: number;
    missing: number;
    numerator: number;
    variant: "success" | "warning" | "danger" | "no_data";
  };
  repos: TQualityGateOutput[];
  repoGroup: string;
  workloadId: string;
};
export type TWorkloadQualityGates = {
  workloadId: string;
  repoGroups: TRepoGroupQualityGates[];
};
