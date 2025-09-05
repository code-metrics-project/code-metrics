import { Request, Response } from "express";
import { listWorkloadIds } from "../config/configMapping";
import { truncateDateOnly } from "../utils/date";
import { PREvent, RepoChange, RepoChurn } from "../model/vcs";
import { ValidationError } from "../utils/validation";
import { vcsPROpenTimeWithArgs } from "../services/repos/prs";
import { vcsRepoChurnWithArgs } from "../services/repos/churn";
import { fetchRepoChanges } from "../services/repos/changes";

export type RepoChangesRequest = {
  workloads: string[];
  repoGroups?: string[];
  startDate?: string;
  endDate?: string;
};

type ArgParseResult<ReturnType> = { error: Error; result: null } | { error: null; result: ReturnType };

export const vcsRepoChanges = async (request: Request, response: Response<RepoChange[]>) => {
  const args = request.query as RepoChangesRequest;

  const { error, result: workloadIds } = getWorkloadIdsFromArgs(args);
  if (error) {
    throw new ValidationError(error.toString());
  }

  const repoGroups = parseRepoGroups(args);

  // format: yyyy-mm-dd
  const startDate = args?.startDate as string;
  if (!startDate) {
    throw new ValidationError("Missing startDate query parameter");
  }

  // format: yyyy-mm-dd
  const endDate = (args?.endDate as string) ?? truncateDateOnly(new Date());

  const result = await fetchRepoChanges(workloadIds, repoGroups, new Date(startDate), new Date(endDate), true);

  response.send(result);
};

// e.g. /api/api/vcs/churn?workloads=ibt&startDate=2022-03-01
export const vcsRepoChurn = async (req: Request, res: Response<RepoChurn[] | string>): Promise<void> => {
  try {
    const args = req.query;
    const { error, result: workloadIds } = getWorkloadIdsFromArgs(args);
    if (error) {
      throw new ValidationError(error.toString());
    }

    const repoGroups = parseRepoGroups(args);

    // format: yyyy-mm-dd
    const startDate = args?.startDate as string;
    if (!startDate) {
      throw new ValidationError("Missing startDate query parameter");
    }

    // format: yyyy-mm-dd
    const endDate = (args?.endDate as string) ?? truncateDateOnly(new Date());

    const result = await vcsRepoChurnWithArgs(workloadIds, repoGroups, startDate, endDate);
    res.json(result);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};

// e.g. /api/api/vcs/pr-open-time?workloads=ibt&startDate=2022-03-01
export const vcsPROpenTime = async (req: Request, res: Response<PREvent[] | string>): Promise<void> => {
  try {
    const args = req.query;
    const { error, result: workloadIds } = getWorkloadIdsFromArgs(args);
    if (error) {
      throw new ValidationError(error.toString());
    }

    let repoGroups: string[];
    const repoGroupsRaw = args?.repoGroups;
    if (!repoGroupsRaw) {
      repoGroups = [];
    } else {
      repoGroups = Array.isArray(repoGroupsRaw)
        ? repoGroupsRaw.map((w) => w.toString())
        : (repoGroupsRaw as string).split(",");
    }

    // format: yyyy-mm-dd
    const startDate = args?.startDate as string;
    if (!startDate) {
      throw new ValidationError("Missing startDate query parameter");
    }

    // format: yyyy-mm-dd
    const endDate = (args?.endDate as string) ?? truncateDateOnly(new Date());

    const result = await vcsPROpenTimeWithArgs(workloadIds, repoGroups, startDate, endDate);
    res.json(result);
  } catch (e) {
    if (e instanceof ValidationError) {
      res.statusCode = 400;
      res.send(e.message);
    } else {
      throw e;
    }
  }
};

const getWorkloadIdsFromArgs = (query): ArgParseResult<string[]> => {
  let workloads: string[];
  const workloadsRaw = query?.workloads;
  if (!workloadsRaw) {
    return { error: new Error("Missing workloads query parameter"), result: null };
  } else {
    workloads = Array.isArray(workloadsRaw)
      ? workloadsRaw.map((w) => w.toString())
      : (workloadsRaw as string).split(",");
  }
  if (workloads.length === 1 && workloads[0] === "all") {
    workloads = listWorkloadIds();
  }

  return { error: null, result: workloads };
};

const parseRepoGroups = (args: Record<string, any>): string[] => {
  const repoGroupsRaw = args?.repoGroups;
  if (!repoGroupsRaw) {
    return [];
  } else {
    return Array.isArray(repoGroupsRaw) ? repoGroupsRaw.map((w) => w.toString()) : (repoGroupsRaw as string).split(",");
  }
};
