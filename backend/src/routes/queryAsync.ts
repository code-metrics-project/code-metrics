import { Request, Response } from "express";
import { RawQuery } from "../model/query";
import { QueryJobStatus } from "../model/queryJob";
import { provideQueryQueue } from "../services/queryQueue/queueFactory";
import { provideQueryResultCache } from "../services/queryResultCache/cacheFactory";

// Queues and caches are resolved lazily, on first use, rather than at module
// load. Module-level initialisation would run before `main()` sets
// `global.isLambda`, so the factories would always pick the in-process
// implementations even in Lambda mode.

/**
 * POST /api/query/async. Records the job as pending and enqueues it for
 * execution.
 */
export const submitAsyncQuery = async (req: Request, res: Response): Promise<void> => {
  const raw: RawQuery = req.body;
  const jobId = crypto.randomUUID();
  const resultCache = provideQueryResultCache();
  const queryQueue = provideQueryQueue();
  await resultCache.store(jobId, { status: QueryJobStatus.Pending, query: raw });
  await queryQueue.enqueue(jobId, raw);
  res.status(202).json({ jobId, pollUrl: `/api/query/async/${jobId}` });
};

/**
 * GET /api/query/async/:jobId. Returns the job result once completed, or the
 * current status while it is pending or processing.
 */
export const getAsyncResult = async (req: Request, res: Response): Promise<void> => {
  const jobId = req.params.jobId;
  const resultCache = provideQueryResultCache();
  const job = await resultCache.get(jobId);

  if (!job) {
    res.status(204).send();
    return;
  }

  if (job.status === QueryJobStatus.Completed) {
    await resultCache.delete(jobId);
    res.json(job.result);
    return;
  }

  if (job.status === QueryJobStatus.Failed) {
    await resultCache.delete(jobId);
    res.status(500).json({ error: job.error });
    return;
  }

  res.status(202).json({ status: job.status });
};
