import { convertMetricsObjToMap } from "@/utils/metrics";
import client from "@/api/client";
import { logger } from "@/utils/logger";
import { QUERY } from "@/api/endpoints";
import type { DatedMetrics, MetricEntry } from "@/model/metrics";
import type { RawQuery } from "@/model/query";

/**
 * Executes a query against the synchronous query endpoint.
 *
 * Used as a fallback when the async query feature is disabled on the backend.
 * Prefer {@link executeQuery} from {@link @/services/queryDispatcher} for
 * feature-aware query execution.
 */
export async function executeQuerySync(query: RawQuery): Promise<Map<string, DatedMetrics>> {
  try {
    logger(`Running "${query.queryName}" query`);
    const response = await client.post<Record<string, Record<string, MetricEntry>>>(QUERY, query);

    logger(`Parsing "${query.queryName}" query`);
    return convertMetricsObjToMap(response.data);
  } catch (error) {
    throw new Error(`Failed to fetch query "${query.queryName}": ${error}`);
  }
}
