import { Response } from "express";
import { logger } from "./logger/logger";
import { getConfigItemAsBoolean } from "../config/sources/source";

const shouldLogResponseBody = getConfigItemAsBoolean("LOG_RESPONSE_BODY");

type SuccessBody = {
  [key: string]: string;
};

type ErrorBody = {
  error: string;
  message?: string;
};

export const success = (res: Response, body: SuccessBody) => {
  res.status(200).send(body);
};

export const unauthorised = (res: Response) => {
  res.status(401).send();
};

export const notFound = (res: Response, body: ErrorBody | undefined) => {
  res.status(404).send(body);
};

export const serverError = (res: Response, body: ErrorBody | undefined) => {
  res.status(500).send(body);
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
