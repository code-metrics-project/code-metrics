import { Request, Response } from "express";
import { logger, warn } from "../utils/logger/logger";
import { precacheRepoList } from "../services/codeManagement/precache";

/**
 * Cache management operations.
 * @param req
 * @param res
 */
export const manageCache = async (req: Request, res: Response): Promise<void> => {
  try {
    switch (req.body.operation) {
      case "update-cache": {
        const startTime = Date.now();
        logger("Triggering cache refresh");
        precacheRepoList()
          .then(() => {
            logger(`Cache refresh complete [duration: ${Date.now() - startTime}ms]`);
          })
          .catch((error) => {
            warn(`Error refreshing cache`, error);
          });
        res.sendStatus(202);
        break;
      }
      default: {
        logger(`Error managing cache - unrecognized command: ${req.body.operation}`);
        res.sendStatus(400);
      }
    }
  } catch (error) {
    throw new Error(`Error managing cache: ${error}`);
  }
};
