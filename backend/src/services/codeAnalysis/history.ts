import { getWorkloadById, listWorkloadIds } from "../../config/configMapping";
import { logger, verbose } from "../../utils/logger/logger";
import { getCodeAnalysisForWorkload, JsonMetricResponse } from "./codeAnalysisService";
import { json2csv } from "json-2-csv";
import { WorkloadId } from "../../model/config/workload-config";

const determineWorkloads = (workloadIds: WorkloadId[]) => {
  if (workloadIds.length === 1 && workloadIds[0] === "all") {
    workloadIds = listWorkloadIds();
  }
  return workloadIds;
};

export const fetchMetricHistoryAsCsv = async (
  workloadIds: WorkloadId[],
  repoGroups: string[],
  metrics: string[],
  startDate: string,
): Promise<string> => {
  const workloads = determineWorkloads(workloadIds).map(getWorkloadById);
  logger(`Fetching metric history for ${workloads.length} workloads as CSV`);

  const results = [];
  for (const workload of workloads) {
    const analysisService = getCodeAnalysisForWorkload(workload);
    const history = await analysisService.fetchMetricHistoryAsCsv(repoGroups, workload, metrics, startDate);
    results.push(...history);
  }

  const csv = json2csv(results as object[], { emptyFieldValue: "" });
  verbose("Metric history CSV", csv);
  return csv;
};

export const fetchMetricHistoryAsJson = async (
  workloadIds: WorkloadId[],
  repoGroups: string[],
  metrics: string[],
  startDate: string,
): Promise<JsonMetricResponse[]> => {
  const workloads = determineWorkloads(workloadIds).map(getWorkloadById);
  logger(`Fetching metric history for ${workloads.length} workloads as JSON`);

  const results = [];
  for (const workload of workloads) {
    const analysisService = getCodeAnalysisForWorkload(workload);
    const history = await analysisService.fetchMetricHistoryAsJson(repoGroups, workload, metrics, startDate);
    results.push(...history);
  }
  return results;
};
