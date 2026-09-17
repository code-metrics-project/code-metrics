import { QueryService } from "../queryService/queryService";
import { QueryResultCache } from "../queryResultCache/queryResultCache";
import { QueryJobStatus } from "../../model/queryJob";
import { RawQuery } from "../../model/query";
import { getConfigItemAsNumber } from "../../config/sources/source";
import { logger } from "../../utils/logger/logger";

const getResultTtl = (): number => getConfigItemAsNumber("ASYNC_QUERY_RESULT_TTL", 3600) * 1000;

/**
 * The executor for async query jobs, recording processing, completed and
 * failed states in the query result cache.
 */
export class QueryExecutor {
  constructor(
    private queryService: QueryService,
    private resultCache: QueryResultCache,
  ) {}

  async execute(jobId: string, rawQuery: RawQuery): Promise<void> {
    logger(`Executing query [job: ${jobId}]`);
    const now = new Date();
    await this.resultCache.store(jobId, {
      id: jobId,
      status: QueryJobStatus.Processing,
      query: rawQuery,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + getResultTtl()),
    });

    try {
      const result = await this.queryService.execute(rawQuery);
      await this.resultCache.store(jobId, {
        status: QueryJobStatus.Completed,
        result,
        updatedAt: new Date(),
      });
    } catch (e) {
      await this.resultCache.store(jobId, {
        status: QueryJobStatus.Failed,
        error: (e as Error).message,
        updatedAt: new Date(),
      });
    }
  }
}
