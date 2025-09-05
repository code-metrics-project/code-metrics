import { Request, Response } from "express";
import { listWorkloadIds } from "../config/configMapping";
import { ValidationError } from "../utils/validation";
import { CsvMetricResponse, JsonMetricResponse } from "../services/codeAnalysis/codeAnalysisService";
import { fetchMetricHistoryAsCsv, fetchMetricHistoryAsJson } from "../services/codeAnalysis/history";

const DEFAULT_METRICS = ["coverage", "lines_to_cover"];

// e.g. /api/codebase/metrics.csv?workloads=ibt&startDate=2022-03-01&metrics=coverage&token=<JWT token>
export const codeAnalysisHistoryAsCsv = async (
  req: Request,
  res: Response<CsvMetricResponse[] | string>,
): Promise<void> => {
  let workloadIds = (req.query?.workloads as string)?.split(",");
  if (!workloadIds) {
    res.statusCode = 400;
    res.send("Missing workloads query parameter");
    return;
  }
  if (workloadIds.length === 1 && workloadIds[0] === "all") {
    workloadIds = listWorkloadIds();
  }

  const repoGroups = (req.query?.repoGroups as string)?.split(",").filter((s) => s) ?? [];
  const metrics = (req.query?.metrics as string)?.split(",") ?? DEFAULT_METRICS;
  const startDate = req.query?.startDate as string;
  if (!startDate) {
    res.statusCode = 400;
    res.send("Missing startDate query parameter");
    return;
  }

  const csv = await fetchMetricHistoryAsCsv(workloadIds, repoGroups, metrics, startDate);
  res.setHeader("Content-Type", "text/csv").send(csv);
};

export const codeAnalysisHistoryAsJson = async (
  req: Request,
  res: Response<JsonMetricResponse[] | string>,
): Promise<void> => {
  try {
    const result = await codeAnalysisHistoryAsJsonWithArgs(req.body);
    res.setHeader("Content-Type", "application/json").send(result);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};

export const codeAnalysisHistoryAsJsonWithArgs = async (args: Record<string, any>): Promise<JsonMetricResponse[]> => {
  let workloads = args?.workloads;
  if (!workloads) {
    throw new ValidationError("Missing workloads body field");
  }
  if (workloads.length === 1 && workloads[0] === "all") {
    workloads = listWorkloadIds();
  }

  const repoGroups = args?.repoGroups ?? [];
  const metrics = args?.metrics ?? DEFAULT_METRICS;
  const startDate = args?.startDate as string;
  if (!startDate) {
    throw new ValidationError("Missing startDate body field");
  }
  return await fetchMetricHistoryAsJson(workloads, repoGroups, metrics, startDate);
};
