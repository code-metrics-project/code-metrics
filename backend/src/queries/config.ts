import { DatedMetrics, DateStamp } from "../model/metrics";

export enum ReduceStrategy {
  SUM = "sum",
  AVERAGE = "average",
}

export type QueryType = {
  name: string;
  execute: (args: any) => Promise<Map<DateStamp, DatedMetrics>>;

  /**
   * The Y-axis name for the chart. This should match the prefix of the dated metrics keys.
   * For example, for a series named `coverage/athena`, the axisName would be `coverage`.
   *
   * A query can be associated with multiple axes, e.g. "vulnerabilities" can
   * emit "vulns-high", "vulns-medium", etc.
   */
  axisNames: string[];

  /**
   * How to reduce the metrics for this query into a single value,
   * when they are aggregated using a dimension.
   */
  reduce: ReduceStrategy;
};

const queryTypes = new Map<string, QueryType>();

export const registerQuery = (queryType: QueryType) => queryTypes.set(queryType.name, queryType);

export const listQueryTypes = (): QueryType[] => Array.from(queryTypes.values());

export const getQueryByName = (queryName: string): QueryType => {
  const query = listQueryTypes().find((q) => queryName === q.name);
  if (!query) {
    throw new Error(`Query with name ${queryName} not found`);
  }
  return query;
};

export const getQueryByAxis = (axisName: string): QueryType => {
  const query = listQueryTypes().find((q) => q.axisNames.includes(axisName));
  if (!query) {
    throw new Error(`Query with axis name ${axisName} not found`);
  }
  return query;
};
