import { Request, Response } from "express";
import { getWorkloadById } from "../config/configMapping";
import { logger } from "../utils/logger/logger";
import { getIssueMgmtForWorkload } from "../services/projectManangement/issueMgmtService";
import { RepoData } from "../model/vcs";
import { processAllIssues } from "../services/codeHotspots/process";

export const findCodeHotspots = async (req: Request, res: Response<RepoData[] | string>): Promise<void> => {
  const { startDate, workload: workloadId, issueTypes } = req.body;

  // Convert startDate to days back from today
  const startDateObj = new Date(startDate);
  const today = new Date();
  const daysBack = Math.ceil((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));

  const workload = getWorkloadById(workloadId);
  const issueTypesInfo = issueTypes?.length ? ` with issue types [${issueTypes.join(", ")}]` : "";
  logger(`Finding code hotspots for ${workloadId} from ${startDate} (${daysBack} days)${issueTypesInfo}`);

  const issueMgmt = getIssueMgmtForWorkload(workload);
  const issueIds = await issueMgmt.getAllTicketIds(workload, daysBack, issueTypes);

  if (issueIds.length) {
    const results = await processAllIssues(issueIds, workloadId);
    res.json(results);
  } else {
    res.send("No issues found");
  }
};
