export type QualityGatesConfig = {
  id: string;
  version: string;
  environments: string[];
  gates: string[];
};

export type QualityGatesConfigWrapper = {
  "quality-gates": QualityGatesConfig[];
};
