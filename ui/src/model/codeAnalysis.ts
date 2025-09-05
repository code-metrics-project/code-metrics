export type CoverageSummary = {
  coverage: number;
  totalLinesToCover: number;
  totalLines: number;
};

export type AnalysisLink = { url: string; repoName: string; title: string };

export type WorkloadRepoGroupCoverage = {
  /**
   * Repo group or component name.
   */
  name: string;
  workloadId: string;
  analysisLinks: AnalysisLink[];
  numProjects: number;
  summary: CoverageSummary | undefined;
};

export type VariantType = "success" | "warning" | "danger" | "no_data";

export type VariantGroupCoverage = WorkloadRepoGroupCoverage & {
  variant: VariantType;
};

export type CodeAnalysisAggregateResponse = {
  current: VariantGroupCoverage[];
  previous: VariantGroupCoverage[];
};
