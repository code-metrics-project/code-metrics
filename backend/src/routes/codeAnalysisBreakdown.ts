import { Request, Response } from "express";
import { logger } from "../utils/logger/logger";
import { getCodeAnalysisForWorkloadId } from "../services/codeAnalysis/codeAnalysisService";

const DEFAULT_METRIC = "coverage";

const DEFAULT_METRIC_PATHS = [
  "src/components",
  "src/models",
  "src/modules",
  "src/router",
  "src/services",
  "src/store",
  "src/utils",
  "src/views",
];

export const fileMetricBreakdown = async (req: Request, res: Response): Promise<void> => {
  const workloadId = req.query.workload as string;
  const repo = req.query.repo as string;

  let metricNames: string[];
  const metricsRaw = req.query?.metrics;
  if (!metricsRaw) {
    metricNames = [DEFAULT_METRIC];
  } else {
    metricNames = Array.isArray(metricsRaw) ? metricsRaw.map((w) => w.toString()) : (metricsRaw as string).split(",");
  }

  let paths: string[];
  const pathsRaw = req.query?.paths;
  if (!pathsRaw) {
    paths = DEFAULT_METRIC_PATHS;
  } else {
    paths = Array.isArray(pathsRaw) ? pathsRaw.map((w) => w.toString()) : (pathsRaw as string).split(",");
  }

  logger(`Running ${metricNames} breakdown for ${workloadId}/${repo} on paths: ${paths}`);
  const analysisService = getCodeAnalysisForWorkloadId(workloadId);

  const result: object[] = [];
  for (const path of paths) {
    const pathResult = { path };

    for (const metricName of metricNames) {
      const metrics = await analysisService.getMetric(workloadId, metricName, repo, path);

      let metricValue: string;
      if (metrics.component?.measures) {
        metricValue = metrics.component.measures[0].value;
      } else {
        if (metrics.errors) {
          console.warn(`Could not parse metrics: ${JSON.stringify(metrics.errors)}`);
        }
        metricValue = "0";
      }
      pathResult[metricName] = {
        value: metricValue,
        analysisLink: analysisService.getMetricLink(workloadId, metricName, repo, path),
      };
    }
    result.push(pathResult);
  }
  res.json(result);
};
