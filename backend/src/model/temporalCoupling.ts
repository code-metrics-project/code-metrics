import { WorkloadId } from "./config/workload-config";

export type FileCouplingPair = {
  fileA: string;
  fileB: string;
  coChangeCount: number;
  percentage: number;
};

export type TemporalCouplingData = {
  workloadId: WorkloadId;
  componentName: string;
  repoName: string;
  totalCommits: number;
  couplingPairs: FileCouplingPair[];
};

export type TemporalCouplingRequest = {
  workload: WorkloadId;
  startDate: string;
  threshold?: number;
};