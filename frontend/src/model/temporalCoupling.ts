export type FileCouplingPair = {
  fileA: string;
  fileB: string;
  coChangeCount: number;
  percentage: number;
};

export type TemporalCouplingData = {
  workloadId: string;
  componentName: string;
  repoName: string;
  totalCommits: number;
  couplingPairs: FileCouplingPair[];
};

export type TemporalCouplingRequest = {
  workload: string | null;
  startDate: string;
  threshold?: number;
};