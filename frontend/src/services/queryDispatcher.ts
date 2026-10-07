import { isFeatureActive, Features } from "@/config/features";
import { executeQueryAsync } from "@/services/asyncQuery";
import { executeQuerySync } from "@/services/query";
import type { RawQuery } from "@/model/query";
import type { DatedMetrics } from "@/model/metrics";

/**
 * Executes a query using the appropriate API based on the backend feature flag.
 * When the `asyncQuery` feature is active on the backend, the async query
 * endpoints (submit + poll) are used.  When it is inactive, the synchronous
 * query endpoint is used as a fallback.
 *
 * @param query - The raw query to execute.
 * @returns A map of metrics keyed by date.
 */
export async function executeQuery(query: RawQuery): Promise<Map<string, DatedMetrics>> {
  if (isFeatureActive(Features.asyncQuery)) {
    return executeQueryAsync(query);
  }
  return executeQuerySync(query);
}
