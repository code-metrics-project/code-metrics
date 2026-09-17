import { RawQuery } from "../../model/query";

/**
 * A queued async query job.
 */
export type QueryJobMessage = {
  jobId: string;
  query: RawQuery;
};

/**
 * Abstraction over the queue that carries async query jobs.
 */
export type QueryQueue = {
  enqueue(jobId: string, query: RawQuery): Promise<void>;
  dequeue(): Promise<QueryJobMessage | null>;
};
