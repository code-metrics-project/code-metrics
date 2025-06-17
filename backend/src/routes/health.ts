import { Request, Response } from "express";
import { success } from "../utils/responses";

export const liveness = async (_req: Request, res: Response) => {
  success(res, {});
};

export const readiness = async (_req: Request, res: Response) => {
  success(res, {});
};
