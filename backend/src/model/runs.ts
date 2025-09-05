import { WorkloadId } from "./config/workload-config";

export enum RunResult {
  Succeeded = "SUCCEEDED",
  Failed = "FAILED",
  Aborted = "ABORTED",
}

export enum ActorType {
  All = "All",
  User = "User",
  Bot = "Bot",
  Organization = "Organization",
  App = "App",
}

export type Run = {
  id: string;
  job: string;
  branch: string;
  repo: string;

  /**
   * Format: yyyy-mm-dd
   */
  startDate: string;
  result: RunResult;

  /**
   * Run duration in seconds.
   */
  duration: number;

  /**
   *  Invoking User
   */
  user?: string;
  userType?: ActorType;
};

/**
 * Wraps a run with extra metadata.
 */
export type RunWithMetadata = {
  jobGroup: string;
  run: Run;
  workloadId: WorkloadId;
  stageId: string;
};

/**
 * Wrapper for an array of runs that can be stored as a collection item.
 */
export type RunList = {
  workloadId: string;
  vcsProjectName: string;

  /**
   * Format: yyyy-mm-dd
   */
  date: string;

  /**
   * TODO rename this to `runs`.
   * **Note:** this will be a breaking change for existing cache entries.
   */
  builds: Run[];
};
