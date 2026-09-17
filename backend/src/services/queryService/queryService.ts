import { RawQuery } from "../../model/query";
import { MetricsWireFormat } from "../../model/metrics";

/**
 * Executes a raw query against the query implementations and returns the
 * grouped, transformed wire-format metrics.
 */
export class QueryService {
  async execute(raw: RawQuery): Promise<MetricsWireFormat> {
    // Imported lazily so lightweight entrypoints (e.g. Lambda) do not load the full query pipeline at module scope.
    const { getQueryByName } = await import("../../queries/config");
    const { convertMetricsMapToObj } = await import("../../utils/metrics");
    const { groupBy } = await import("../../utils/grouping");
    const { processArgs, applyTransforms } = await import("../../routes/query");

    const query = getQueryByName(raw.queryName);
    const args = processArgs(raw.args);
    const result = await query.execute(args);
    const grouped = await groupBy(raw, result);
    const transformed = await applyTransforms(raw, grouped);
    return convertMetricsMapToObj(transformed);
  }
}
