import { Request, Response } from "express";
import { getQualityGates } from "../services/qualityGates/qualityGates";

type TRawRequest = {
  workloads?: string[];
  repoGroups?: string[];
};

export const fetchQualityGates = async (req: Request, res: Response): Promise<void> => {
  const raw: TRawRequest = req.body;
  try {
    const output = await getQualityGates(raw.workloads, raw.repoGroups);
    res.json(output);
  } catch (e) {
    throw new Error(
      `Failed to fetch quality gates for workloads: '${raw.workloads}' - repoGroups: '${raw.repoGroups}': ${e}.`,
    );
  }
};
