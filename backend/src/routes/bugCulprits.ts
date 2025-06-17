import { Request, Response } from "express";
import { getWorkloadById } from "../config/configMapping";
import { logger } from "../utils/logger/logger";
import { getIssueMgmtForWorkload } from "../services/projectManangement/issueMgmtService";
import { RepoData } from "../model/vcs";
import { processAllIssues } from "../services/bugCulprits/process";

export const findBugCulprits = async (req: Request, res: Response<RepoData[] | string>): Promise<void> => {
  const { daysBack, workload: workloadId } = req.body;
  if (!workloadId) throw new Error("workload is required");
  if (!daysBack) throw new Error("daysBack is required");

  const workload = getWorkloadById(workloadId);
  logger(`Finding bug culprits for ${workloadId} over last ${daysBack} days`);

  const issueMgmt = getIssueMgmtForWorkload(workload);
  const issueIds = await issueMgmt.getAllTicketIds(workload, daysBack);

  if (issueIds.length) {
    const results = await processAllIssues(issueIds, workloadId);
    res.json(results);
  } else {
    res.send("No issues found");
  }
};
