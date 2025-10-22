import { Request, Response } from "express";
import { DependencyAlertsAnalysis } from "../model/dependencyAlerts";
import { dependencyAlertsService } from "../services/dependencyAlerts/dependencyAlerts";
import { ValidationError } from "../utils/validation";
import { WorkloadId } from "../model/config/workload-config";
import { listWorkloads } from "../config/configMapping";

type DependencyAlertsQueryParams = {
  workloadIds: string | string[];
  repo?: string;
  repoGroups?: string | string[];
};

// e.g. GET /api/security/dependency-alerts?workloadIds=foo,bar&repo=vscode
// or GET /api/security/dependency-alerts?workloadIds=foo,bar&repoGroups=frontend,backend
export const getDependencyAlerts = async (
  req: Request<any, any, any, DependencyAlertsQueryParams>,
  res: Response<DependencyAlertsAnalysis[] | string>
): Promise<void> => {
  try {
    const { workloadIds: workloadIdsRaw, repo, repoGroups: repoGroupsRaw } = req.query;

    if (!workloadIdsRaw) {
      throw new ValidationError("Missing workloadIds query parameter");
    }
    
    if (!repo && !repoGroupsRaw) {
      throw new ValidationError("Must provide either repo or repoGroups query parameter");
    }

    let workloadIds: WorkloadId[] = Array.isArray(workloadIdsRaw)
      ? workloadIdsRaw.map((w) => w.toString())
      : (workloadIdsRaw as string).split(",");

    // Handle "all" as a special case to select all workloads
    if (workloadIds.includes("all")) {
      workloadIds = listWorkloads().map((w) => w.id);
    }

    const repoGroups: string[] | undefined = repoGroupsRaw
      ? Array.isArray(repoGroupsRaw)
        ? repoGroupsRaw.map((rg) => rg.toString())
        : (repoGroupsRaw as string).split(",")
      : undefined;

    const results = await dependencyAlertsService.fetchDependencyAlertsForWorkloads(
      workloadIds,
      repo,
      repoGroups
    );
    res.json(results);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};
