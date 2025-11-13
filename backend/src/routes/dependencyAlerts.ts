import { Request, Response } from "express";
import { DependencyAlertsAnalysis } from "../model/dependencyAlerts";
import { ValidationError } from "../utils/validation";
import { WorkloadId } from "../model/config/workload-config";
import { getWorkloadsWithTags, listWorkloads } from "../config/configMapping";
import { getDependencyAlertsForWorkloadId } from "../services/dependencyAlerts/dependencyAlertsService";
import { Tags } from "../model/tags";
import { uniq } from "lodash";

type DependencyAlertsQueryParams = {
  workloadIds: string | string[];
  tags?: string;
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
    const { workloadIds: workloadIdsRaw, tags: tagsRaw, repo, repoGroups: repoGroupsRaw } = req.query;

    if (!workloadIdsRaw && !tagsRaw) {
      throw new ValidationError("Missing workloadIds or tags query parameter");
    }
    
    if (!repo && !repoGroupsRaw) {
      throw new ValidationError("Must provide either repo or repoGroups query parameter");
    }

    let workloadIds: WorkloadId[] = Array.isArray(workloadIdsRaw)
      ? workloadIdsRaw.map((w) => w.toString())
      : workloadIdsRaw?.length ? (workloadIdsRaw as string).split(",")
      : [];

    // Handle "all" as a special case to select all workloads
    if (workloadIds.includes("all")) {
      workloadIds = listWorkloads().map((w) => w.id);
    }

    const tags: Tags = tagsRaw ? tagsRaw.split(",").map((tag) => {
      const [key, value] = tag.split("=");
      return { key, value };
    }) : [];

    workloadIds.push(...getWorkloadsWithTags(tags));
    workloadIds = uniq(workloadIds);

    const repoGroups: string[] | undefined = repoGroupsRaw
      ? Array.isArray(repoGroupsRaw)
        ? repoGroupsRaw.map((rg) => rg.toString())
        : (repoGroupsRaw as string).split(",")
      : undefined;

    const results: DependencyAlertsAnalysis[] = [];

    for (const workloadId of workloadIds) {
      const dependencyAlertsService = getDependencyAlertsForWorkloadId(workloadId);
      const alerts = await dependencyAlertsService.fetchDependencyAlerts(workloadId, repo, repoGroups);
      results.push(...alerts);
    }
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
