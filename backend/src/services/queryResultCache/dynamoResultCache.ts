import { QueryResultCache } from "./queryResultCache";
import { QueryJob } from "../../model/queryJob";
import { provideDatastore } from "../../db/factory";
import { QueryFilter, DatastoreCollection } from "../../db/api";
import { getConfigItemAsNumber } from "../../config/sources/source";
import { logger } from "../../utils/logger/logger";

const COLLECTION_NAME = "asyncQueryResults";

const getResultTtlSeconds = (): number => getConfigItemAsNumber("ASYNC_QUERY_RESULT_TTL", 3600);

type QueryJobFilter = QueryFilter & {
  id: string;
};

/**
 * The DynamoDB implementation of the query result cache, used in Lambda mode.
 * Jobs expire after ASYNC_QUERY_RESULT_TTL seconds.
 */
export class DynamoResultCache implements QueryResultCache {
  private datastore;

  constructor() {
    logger("Using DynamoDB query result cache");
    const ttlSeconds = getResultTtlSeconds();
    logger(`Async query result cache TTL: ${ttlSeconds}s`);
    this.datastore = provideDatastore<QueryJobFilter>("asyncQueryCache", {
      expireAfterSeconds: ttlSeconds,
      ttlIfToday: ttlSeconds,
      persistentStore: true,
    });
  }

  store(jobId: string, data: Partial<QueryJob> & { status: QueryJob["status"] }): Promise<void> {
    return this.datastore.connect(COLLECTION_NAME, async (collection: DatastoreCollection) => {
      const existing = await collection.findOne({ id: jobId });
      const now = new Date();
      const job: QueryJob = {
        id: jobId,
        status: data.status,
        query: (existing as QueryJob)?.query ?? (data.query as QueryJob["query"]),
        result: data.result ?? (existing as QueryJob)?.result,
        error: data.error ?? (existing as QueryJob)?.error,
        createdAt: (existing as QueryJob)?.createdAt ?? now,
        updatedAt: now,
        expiresAt: (existing as QueryJob)?.expiresAt ?? new Date(Date.now() + getResultTtlSeconds() * 1000),
      };
      await collection.deleteOne({ id: jobId });
      await collection.insertOne({ id: jobId }, job);
    });
  }

  get(jobId: string): Promise<QueryJob | null> {
    return this.datastore.connect(COLLECTION_NAME, async (collection: DatastoreCollection) => {
      const item = await collection.findOne({ id: jobId });
      if (!item) {
        return null;
      }
      const job = item as QueryJob;
      if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
        return null;
      }
      return job;
    });
  }

  delete(jobId: string): Promise<void> {
    return this.datastore.connect(COLLECTION_NAME, async (collection: DatastoreCollection) => {
      await collection.deleteOne({ id: jobId });
    });
  }
}
