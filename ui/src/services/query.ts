import { convertMetricsObjToMap } from "@/utils/metrics";
import axios from "@/utils/axios";
import { logger } from "@/utils/logger";
import { QUERY } from "@/utils/urls";
import type { DatedMetrics } from "@/model/metrics";
import type { RawQuery } from "@/model/query";

export async function executeQuery(query: RawQuery): Promise<Map<string, DatedMetrics>> {
  try {
    logger(`Running "${query.queryName}" query`);
    const response = await axios.post(QUERY, query);

    logger(`Parsing "${query.queryName}" query`);
    return convertMetricsObjToMap(response.data);
  } catch (error) {
    throw new Error(`Failed to fetch query "${query.queryName}": ${error}`);
  }
}
