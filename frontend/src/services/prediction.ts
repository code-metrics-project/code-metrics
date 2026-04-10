import client from "@/api/client";
import { type MetricEntry } from "@/model/metrics";
import { type RawQuery, TransformTypes } from "@/model/query";

export enum QueryName {
  BugsNew = "bugs-new",
}

type QueryResults = Record<string, Record<string, MetricEntry>>;
type NamedQueryResults = Record<string, QueryResults>;

export async function predict(inputQueries: RawQuery[], labelQuery: RawQuery): Promise<NamedQueryResults> {
  // compensate for the peakiness of the new bugs metric
  if (labelQuery.queryName === QueryName.BugsNew) {
    labelQuery.transforms = [{ transform: TransformTypes.RollingAverages, args: { days: 7 } }];
  }
  const response = await client.post<NamedQueryResults>("/api/prediction/linear", {
    inputQueries,
    labelQuery,
  });
  return response.data;
}
