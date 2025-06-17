import { Request, Response } from "express";
import { listWorkloadIds } from "../config/configMapping";
import { logger } from "../utils/logger/logger";
import { MILLIS_PER_DAY } from "../utils/date";
import { CodeAnalysisAggregateResponse } from "../model/codeAnalysis";
import { getCoverage, WorkloadRepo } from "../services/codeAnalysis/aggregate";

export const codeAnalysisAggregate = async (
  req: Request,
  res: Response<CodeAnalysisAggregateResponse>,
): Promise<void> => {
  const repoGroups = req.body?.repoGroups ?? [];
  const endTime: number = req.body?.endTime || new Date().getTime();
  const startTime: number = req.body?.startTime || endTime - MILLIS_PER_DAY * 7;
  const aggregate: boolean = req.body?.aggregate ?? true;
  const individualRepos: WorkloadRepo[] = req.body?.individualRepos ?? [];

  let workloads = req.body?.workloads ?? [];
  if (workloads.length === 1 && workloads[0] === "all") {
    workloads = listWorkloadIds();
  }

  try {
    const [currentCoverage, previousCoverage] = await Promise.all([
      getCoverage(workloads, repoGroups, individualRepos, endTime, aggregate),
      getCoverage(workloads, repoGroups, individualRepos, startTime, aggregate),
    ]);
    res.send({
      current: currentCoverage,
      previous: previousCoverage,
    });
  } catch (error) {
    logger(error);
    res.sendStatus(500);
  }
};
