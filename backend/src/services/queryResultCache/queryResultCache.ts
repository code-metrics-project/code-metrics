import { QueryJob } from "../../model/queryJob";

/**
 * Abstraction over the store of async query jobs and their results.
 */
export type QueryResultCache = {
  store(jobId: string, result: Partial<QueryJob> & { status: QueryJob["status"] }): Promise<void>;
  get(jobId: string): Promise<QueryJob | null>;
  delete(jobId: string): Promise<void>;
  destroy?(): void;
};
