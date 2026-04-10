import { Request, Response } from "express";
import { logger } from "../utils/logger/logger";
import { TemporalCouplingData } from "../model/temporalCoupling";
import { processAllComponents } from "../services/temporalCoupling";

export const findTemporalCoupling = async (
  req: Request,
  res: Response<TemporalCouplingData[] | string>,
): Promise<void> => {
  const { startDate, workload: workloadId, threshold } = req.body;

  const endDate = new Date().toISOString().split("T")[0];

  const startDateObj = new Date(startDate);
  const today = new Date();
  const daysBack = Math.ceil((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
  const thresholdInfo = threshold ? ` with threshold ${threshold}` : "";

  logger(`Finding temporal coupling for ${workloadId} from ${startDate} to ${endDate} (${daysBack} days)${thresholdInfo}`);

  try {
    const results = await processAllComponents(workloadId, startDate, endDate, threshold);
    res.json(results);
  } catch (err) {
    logger(`Error finding temporal coupling: ${err}`);
    res.status(500).send(`Error analyzing temporal coupling: ${err.message}`);
  }
};