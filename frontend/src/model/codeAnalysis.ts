import type { VariantType } from "@/utils/colours";

export interface CoverageSummary {
  coverage: number;
  totalLinesToCover: number;
  totalLines: number;
}

export interface AnalysisLink {
  url: string;
  repoName: string;
  title: string;
}

export interface WorkloadRepoGroupCoverage {
  /**
   * Repo group or component name.
   */
  name: string;
  workloadId: string;
  analysisLinks: AnalysisLink[];
  numProjects: number;
  summary: CoverageSummary | undefined;
}

export type VariantGroupCoverage = WorkloadRepoGroupCoverage & {
  variant: VariantType;
};

export interface CodeAnalysisAggregateResponse {
  current: VariantGroupCoverage[];
  previous: VariantGroupCoverage[];
}
