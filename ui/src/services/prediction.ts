import axios from "@/utils/axios";
import { type MetricEntry } from "@/model/metrics";
import { type RawQuery, TransformTypes } from "@/model/query";
import { type AxiosResponse } from "axios";
import { QueryName } from "@/queries/queries";

type PredictionRequest = {
  inputQueries: RawQuery[];
  labelQuery: RawQuery;
};
type QueryResults = Record<string, Record<string, MetricEntry>>;
type NamedQueryResults = Record<string, QueryResults>;

export async function predict(
  inputQueries: RawQuery[],
  labelQuery: RawQuery,
): Promise<NamedQueryResults> {
  // compensate for the peakiness of the new bugs metric
  if (labelQuery.queryName === QueryName.BugsNew) {
    labelQuery.transforms = [
      { transform: TransformTypes.RollingAverages, args: { days: 7 } },
    ];
  }
  const response = await axios.post<any, AxiosResponse, PredictionRequest>(
    "/api/prediction/linear",
    {
      inputQueries,
      labelQuery,
    },
  );
  return response.data;
}
