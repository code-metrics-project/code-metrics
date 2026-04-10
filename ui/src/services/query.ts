import { convertMetricsObjToMap } from "@/utils/metrics";
import { client } from "@/utils/apiClient";
import { logger } from "@/utils/logger";
import { QUERY } from "@/utils/urls";
import type { DatedMetrics, MetricEntry } from "@/model/metrics";
import type { RawQuery } from "@/model/query";

export async function executeQuery(query: RawQuery): Promise<Map<string, DatedMetrics>> {
  try {
    logger(`Running "${query.queryName}" query`);
    const response = await client.post<Record<string, Record<string, MetricEntry>>>(QUERY, query);

    logger(`Parsing "${query.queryName}" query`);
    return convertMetricsObjToMap(response.data);
  } catch (error) {
    throw new Error(`Failed to fetch query "${query.queryName}": ${error}`);
  }
}
