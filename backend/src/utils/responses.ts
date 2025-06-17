import { Response } from "express";
import { logger } from "./logger/logger";

const shouldLogResponseBody = !!process.env.LOG_RESPONSE_BODY;

type SuccessBody = {
  [key: string]: string;
};

export const success = (res: Response, body: SuccessBody) => {
  res.status(200);
  res.send(body);
};

export const unauthorised = (res: Response) => {
  res.status(401);
  res.send();
};

/**
 * Logs the response body `res`, if `shouldLogResponseBody` is true.
 * Always returns `res`.
 *
 * @param url
 * @param res
 */
export const logResponseBody = <T>(url: string, res: T): T => {
  if (shouldLogResponseBody) {
    logger(url, JSON.stringify(res));
  }
  return res;
};

