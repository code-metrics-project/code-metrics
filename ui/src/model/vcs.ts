import { type DatedMetricEntry } from "@/model/metrics";

export interface RepoChurn {
  workload: string;
  projectName: string;
  repoName: string;
  branch: string;
  changes: DatedMetricEntry<AggregatedFileChanges>[];
}

export interface AggregatedFileChanges extends FileChanges {
  count: number;
}

export interface FileChanges {
  added: number;
  edited: number;
  deleted: number;
}

export type ChangeLinks = {
  commitLink?: string;
  issueId?: string;
  issueTitle?: string;
  issueType?: string;
  issueLink?: string;
  prTitle?: string;
  prLink?: string;
};

export interface EnrichedRepoChange {
  date: string;
  workload: string;
  repo: string;
  branch: string;
  commitId: string;
  message: string;
  links: ChangeLinks;
}

export interface PathData {
  path: string;
  count: number;
  coverage: string;
  issueIds: string[];
}

export interface RepoData {
  workloadId: string;
  componentName: string;
  repoName: string;
  pathData: PathData[];
}
