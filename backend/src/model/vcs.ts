import { DatedMetricEntry } from "./metrics";
import { WorkloadId } from "./config/workload-config";

export type RepoChurn = {
  workloadId: WorkloadId;
  repoGroup: string;
  projectName: string;
  repoName: string;
  changes: DatedMetricEntry<AggregatedFileChanges>[];
};

export type AggregatedFileChanges = {
  count: number;
} & FileChanges;

export type FileChanges = {
  added: number;
  edited: number;
  deleted: number;
};

export type RepoChangeSummary = {
  projectName: string;
  repositoryName: string;
  branch: string;
  date: string;
  commits: string[];
  changes: FileChanges[];
};

export type PREvent = {
  workloadId: WorkloadId;
  projectName: string;
  repositoryName: string;
  changes: {
    date: string;
    created: Date;
    untilReview: number;
    untilApproval: number;
    untilCompletion: number;
  }[];
};

export type PREventDetail = {
  workloadId: WorkloadId;
  projectName: string;
  repositoryName: string;
  changes: {
    additions: number;
    changedFiles: number;
    commits: number;
    date: string;
    deletions: number;
  }[];
};

export type RepoChange = {
  /**
   * Full date and time of the change.
   */
  date: string;
  workload: string;
  repo: string;
  branch: string;
  commitId: string;
  message: string;
};

export type ChangeLinks = {
  commitLink?: string;
  issueId?: string;
  issueTitle?: string;
  issueType?: string;
  issueLink?: string;
  prTitle?: string;
  prLink?: string;
};

export type EnrichedRepoChange = RepoChange & {
  /**
   * These properties shouldn't be stored, to allow the issue
   * matching logic to change.
   */
  links: ChangeLinks;
};

export type PullRequest = {
  id: number;
  workloadId: WorkloadId;
  vcsProjectName: string;
  repositoryName: string;
  sourceBranch: string;
  title: string;
  message: string;
  url?: string;
};

// TODO: consider merging with PullRequest model
export type LightweightPR = {
  id: number;
  workloadId: string;
  vcsProjectName: string;
  repositoryName: string;
  title: string;
  completionOptions?: {
    bypassPolicy: boolean;
    bypassReason: string;
  };
};

export type PrFileChangeItem = {
  path: string;
};

export type CompletePrInfo = {
  pr: LightweightPR;
  issueId: string;
  filesChanged: PrFileChangeItem[];
};

export type PathData = {
  path: string;
  count: number;
  coverage: string;
  issueIds: string[];
  issueLinks: { id: string; url: string }[];
};

export type RepoData = {
  workloadId: string;
  componentName: string;
  repoName: string;
  pathData: PathData[];
};

export type ChangeCategory = "ticketed" | "pr" | "commit";
