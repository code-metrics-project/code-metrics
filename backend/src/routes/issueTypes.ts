import { Request, Response } from "express";
import { getWorkloadById } from "../config/configMapping";
import { logger } from "../utils/logger/logger";
import { getIssueMgmtForWorkload } from "../services/projectManangement/issueMgmtService";

export type IssueTypesResponse = {
  workloadId: string;
  issueTypes: string[];
};

/**
 * GET /api/workloads/:workloadId/issue-types
 *
 * Returns available issue types for the given workload based on configuration.
 */
export const getIssueTypes = async (
  req: Request<{ workloadId: string }>,
  res: Response<IssueTypesResponse | string>,
): Promise<void> => {
  const { workloadId } = req.params;

  try {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      res.status(404).send(`Workload not found: ${workloadId}`);
      return;
    }

    logger(`Fetching issue types for workload ${workloadId}`);

    const issueMgmt = getIssueMgmtForWorkload(workload);
    const issueTypes = issueMgmt.getAvailableIssueTypes(workloadId);

    res.json({
      workloadId,
      issueTypes,
    });
  } catch (error) {
    logger(`Error fetching issue types for ${workloadId}: ${error.message}`);
    res.status(500).send(`Error fetching issue types: ${error.message}`);
  }
};
