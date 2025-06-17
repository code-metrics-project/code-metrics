import { Request, Response } from "express";
import { RunWithMetadata } from "../model/runs";
import { listWorkloadIds } from "../config/configMapping";
import { ValidationError } from "../utils/validation";
import { fetchDeploymentsForRun, fetchRunById, fetchRuns, fetchRunUrl } from "../services/pipelines/common";
import { WorkloadId } from "../model/config/workload-config";
import { getIdOfFirstStage, reifyMetaStageId } from "../services/deployment/common";

// e.g. /api/pipeline/runs?workloads=ibt&startDate=2022-03-01
export const getPipelineRuns = async (
  req: Request,
  res: Response<RunWithMetadata[] | string>,
): Promise<void> => {
  try {
    const {
      workloads,
      startDate,
      jobGroups,
      branch,
      stageId,
    } = req.query;

    if (!branch) {
      throw new ValidationError("Missing branch query parameter");
    }

    const runs = await getPipelineRunsWithArgs({
      workloads,
      startDate,
      jobGroups,
      branches: [branch],
      stageId,
    });
    res.json(runs);

  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};

// e.g. /api/pipeline/run?runId=foo&workloadId=bar&jobName=baz
export const getPipelineRun = async (
  req: Request,
  res: Response<RunWithMetadata | string>,
): Promise<void> => {
  try {
    const runId = req.query.runId as string;
    if (!runId) {
      throw new ValidationError("Missing runId query parameter");
    }
    const workloadId = req.query.workloadId as string;
    if (!workloadId) {
      throw new ValidationError("Missing workloadId query parameter");
    }
    const jobName = req.query.jobName as string;
    if (!jobName) {
      throw new ValidationError("Missing jobName query parameter");
    }
    let stageId: string = req.query.stageId as string;
    if (!stageId) {
      throw new ValidationError("Missing stageId query parameter");
    }
    stageId = reifyMetaStageId(stageId, workloadId);

    const run = await fetchRunById(workloadId, stageId, jobName, runId);
    if (!run) {
      res.statusCode = 404;
      res.send(`Run not found for ${workloadId} / ${runId}`);
      return
    } else {
      res.json(run);
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};

// e.g. /api/pipeline/run?runId=foo&workloadId=bar&jobName=baz
export const getPipelineRunRedirect = async (
  req: Request,
  res: Response<RunWithMetadata | string>,
): Promise<void> => {
  try {
    const runId = req.query.runId as string;
    if (!runId) {
      throw new ValidationError("Missing runId query parameter");
    }
    const workloadId = req.query.workloadId as string;
    if (!workloadId) {
      throw new ValidationError("Missing workloadId query parameter");
    }
    const jobName = req.query.jobName as string;
    if (!jobName) {
      throw new ValidationError("Missing jobName query parameter");
    }
    let stageId: string = req.query.stageId as string;
    if (!stageId) {
      throw new ValidationError("Missing stageId query parameter");
    }
    stageId = reifyMetaStageId(stageId, workloadId);

    const runUrl = fetchRunUrl(workloadId, stageId, jobName, runId);
    if (!runUrl) {
      res.statusCode = 404;
      res.send(`Run not found for ${workloadId} / ${runId}`);
      return
    } else {
      res.redirect(runUrl)
    }

  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};

// e.g. /api/pipeline/deployments?runId=foo&workloadId=bar&jobName=baz
export const getPipelineDeployments = async (
  req: Request,
  res: Response<RunWithMetadata[] | string>,
): Promise<void> => {
  try {
    const runId = req.query.runId as string;
    if (!runId) {
      throw new ValidationError("Missing runId query parameter");
    }
    const workloadId = req.query.workloadId as string;
    if (!workloadId) {
      throw new ValidationError("Missing workloadId query parameter");
    }
    const jobName = req.query.jobName as string;
    if (!jobName) {
      throw new ValidationError("Missing jobName query parameter");
    }
    let stageId: string = req.query.stageId as string;
    if (!stageId) {
      throw new ValidationError("Missing stageId query parameter");
    }
    stageId = reifyMetaStageId(stageId, workloadId);

    const run = await fetchRunById(workloadId, stageId, jobName, runId);
    if (!run) {
      res.statusCode = 404;
      res.send(`Run not found for ${workloadId} / ${runId}`);
      return
    }
    const deploymentRuns = await fetchDeploymentsForRun(workloadId, stageId, jobName, runId);
    res.json(deploymentRuns);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};

export const getPipelineRunsWithArgs = async (args: Record<string, any>): Promise<RunWithMetadata[]> => {
  try {
    let workloadIds: WorkloadId[];
    const workloadsRaw = args?.workloads;
    if (!workloadsRaw) {
      throw new ValidationError("Missing workloads query parameter");
    } else {
      workloadIds = Array.isArray(workloadsRaw)
        ? workloadsRaw.map((w) => w.toString())
        : (workloadsRaw as string).split(",");
    }
    if (workloadIds.length === 1 && workloadIds[0] === "all") {
      workloadIds = listWorkloadIds();
    }

    if (workloadIds.length === 0) {
      return [];
    }

    let startDate: Date;
    // query param format: yyyy-mm-dd
    const startDateRaw = args?.startDate as string;
    if (!startDateRaw) {
      throw new ValidationError("Missing startDate query parameter");
    } else {
      startDate = new Date(startDateRaw);
    }

    // query param format: yyyy-mm-dd
    const endDate = new Date((args?.endDate as string) ?? new Date());

    let jobGroups: string[];
    const jobGroupsRaw = args?.jobGroups;
    if (!jobGroupsRaw) {
      jobGroups = [];
    } else {
      jobGroups = Array.isArray(jobGroupsRaw)
        ? jobGroupsRaw.map((w) => w.toString())
        : (jobGroupsRaw as string).split(",");
    }

    let branches: string[];
    const branchesRaw = args?.branches;
    if (!branchesRaw) {
      branches = [];
    } else {
      branches = Array.isArray(branchesRaw) ? branchesRaw.map((w) => w.toString()) : (branchesRaw as string).split(",");
    }

    let stageId: string;
    const stageIdRaw = args?.stageId;
    if (!stageIdRaw) {
      stageId = getIdOfFirstStage(workloadIds[0]);
    } else {
      stageId = stageIdRaw as string;
    }
    stageId = reifyMetaStageId(stageId, workloadIds[0]);

    return await fetchRuns(workloadIds, stageId, jobGroups, branches, startDate, endDate);
  } catch (e) {
    throw new Error(`Failed to fetch pipeline runs: ${e}`);
  }
};
