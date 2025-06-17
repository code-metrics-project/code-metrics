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
  workloadId: string;
  stageId: string;
};
