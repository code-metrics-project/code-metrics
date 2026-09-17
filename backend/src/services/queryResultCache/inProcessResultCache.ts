import { QueryResultCache } from "./queryResultCache";
import { QueryJob } from "../../model/queryJob";
import { getConfigItemAsNumber } from "../../config/sources/source";
import { logger } from "../../utils/logger/logger";

const getResultTtl = (): number => getConfigItemAsNumber("ASYNC_QUERY_RESULT_TTL", 3600) * 1000;

/**
 * The in-memory implementation of the query result cache, used in server and
 * desktop modes. Jobs expire after ASYNC_QUERY_RESULT_TTL seconds.
 */
export class InProcessResultCache implements QueryResultCache {
  private cache = new Map<string, QueryJob>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  constructor() {
    logger("Using in-process query result cache");
    const ttl = getResultTtl();
    logger(`Async query result cache TTL: ${ttl}ms`);
  }

  destroy(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.cache.clear();
  }

  store(jobId: string, data: Partial<QueryJob> & { status: QueryJob["status"] }): Promise<void> {
    const existing = this.cache.get(jobId);
    const now = new Date();
    const job: QueryJob = {
      id: jobId,
      status: data.status,
      query: existing?.query ?? (data.query as QueryJob["query"]),
      result: data.result ?? existing?.result,
      error: data.error ?? existing?.error,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      expiresAt: existing?.expiresAt ?? new Date(Date.now() + getResultTtl()),
    };

    if (this.timeouts.has(jobId)) {
      clearTimeout(this.timeouts.get(jobId));
    }

    const timeout = setTimeout(() => {
      this.cache.delete(jobId);
      this.timeouts.delete(jobId);
    }, getResultTtl());

    this.cache.set(jobId, job);
    this.timeouts.set(jobId, timeout);
    return Promise.resolve();
  }

  get(jobId: string): Promise<QueryJob | null> {
    const job = this.cache.get(jobId);
    if (!job) {
      return Promise.resolve(null);
    }
    if (job.expiresAt < new Date()) {
      this.cache.delete(jobId);
      if (this.timeouts.has(jobId)) {
        clearTimeout(this.timeouts.get(jobId));
        this.timeouts.delete(jobId);
      }
      return Promise.resolve(null);
    }
    return Promise.resolve(job);
  }

  delete(jobId: string): Promise<void> {
    this.cache.delete(jobId);
    if (this.timeouts.has(jobId)) {
      clearTimeout(this.timeouts.get(jobId));
      this.timeouts.delete(jobId);
    }
    return Promise.resolve();
  }
}
