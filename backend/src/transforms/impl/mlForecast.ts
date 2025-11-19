import { listWorkloadIds } from "../../config/configMapping";
import { type IntermediaryDatedMetrics, MetricEntry } from "../../model/metrics";
import { RawQuery } from "../../model/query";

type TMLForecastArgs = {
  forecastEndDate: string;
  forecastModel: string;
  forecastStartDate: string;
  trainingDataStartDate: string;
};

type TMLForecastAPIResponse = {
  forecast: { [key: string]: number };
  metric: string;
  model: string;
  rms: number;
};

function getWorkloadIdsFromArgs(query: RawQuery["args"]): string[] {
  let workloads: string[];
  const workloadsRaw = query?.workloads;
  if (!workloadsRaw) {
    throw new Error("Missing workloads query parameter");
  } else {
    workloads = Array.isArray(workloadsRaw)
      ? workloadsRaw.map((w) => w.toString())
      : (workloadsRaw as string).split(",");
  }
  if (workloads.length === 1 && workloads[0] === "all") {
    workloads = listWorkloadIds();
  }

  return workloads;
}

async function fetchMLForecast(
  workload,
  { forecastEndDate, forecastModel, forecastStartDate, trainingDataStartDate }: TMLForecastArgs,
): Promise<TMLForecastAPIResponse> {
  // TODO: Fetch this from API.
  const response = await fetch("http://localhost:8080/ml");
  return response.json();
}

function mapForecastToDateMetrics({ forecast, metric }: TMLForecastAPIResponse): Map<string, IntermediaryDatedMetrics> {
  const mappedData = new Map<string, IntermediaryDatedMetrics>();
  Object.entries(forecast).forEach(([key, value]) => {
    const entries = new Map<string, MetricEntry>();
    entries.set(metric, { date: key, value });
    mappedData.set(key, { entries });
  });
  return mappedData;
}

export async function getMLForecast(
  query: RawQuery,
  args: TMLForecastArgs,
): Promise<Map<string, IntermediaryDatedMetrics>> {
  const workloads = getWorkloadIdsFromArgs(query.args);

  const forecasts = await Promise.all(
    workloads.map(async (workload) => {
      const mlForecastData = await fetchMLForecast(workload, args);
      return mapForecastToDateMetrics(mlForecastData);
    }),
  );

  return forecasts[0];
}
