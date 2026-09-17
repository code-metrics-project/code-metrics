import client, { HttpError } from "@/api/client";
import { QUERY_ASYNC, QUERY_ASYNC_JOB } from "@/api/endpoints";
import type { DatedMetrics, MetricEntry } from "@/model/metrics";
import type { RawQuery } from "@/model/query";
import { convertMetricsObjToMap } from "@/utils/metrics";

/**
 * The acknowledgement returned when submitting an async query.
 */
export type AsyncQueryJob = {
  jobId: string;
  pollUrl: string;
};

/**
 * Submits a query for async execution and returns the job to poll.
 */
export async function submitAsyncQuery(query: RawQuery): Promise<AsyncQueryJob> {
  const response = await client.post<AsyncQueryJob>(QUERY_ASYNC, query);
  return response.data;
}

/**
 * Polls the job until it completes and returns the result, backing off between
 * attempts. Throws when the job is not found, fails, or the timeout elapses.
 */
export async function pollForResult(
  jobId: string,
  timeoutMs = 60000,
  intervalMs = 1000
): Promise<Map<string, DatedMetrics>> {
  const startTime = Date.now();
  let currentInterval = intervalMs;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await client.get<Record<string, Record<string, MetricEntry>>>(QUERY_ASYNC_JOB(jobId));
      if (response.status === 200) {
        return convertMetricsObjToMap(response.data);
      }
      if (response.status === 202) {
        await sleep(currentInterval);
        currentInterval = Math.min(currentInterval * 1.5, 5000);
        continue;
      }
      if (response.status === 204) {
        throw new Error(`Query job ${jobId} not found`);
      }
    } catch (error) {
      if (error instanceof HttpError && error.response.status === 500) {
        const errData = error.response.data as { error?: string };
        throw new Error(`Query failed: ${errData.error ?? "unknown error"}`);
      }
      throw error;
    }
  }

  throw new Error(`Query timed out after ${timeoutMs}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Submits a query for async execution and resolves once its result is
 * available.
 */
export async function executeQueryAsync(query: RawQuery): Promise<Map<string, DatedMetrics>> {
  const { jobId } = await submitAsyncQuery(query);
  return pollForResult(jobId);
}
