import { type ErrorRequestHandler } from "express";
import TITLE_MAP from "./messages.json";
import * as OpenApiValidator from "express-openapi-validator";
import path from "node:path";

/**
 * Builds the OpenAPI validator middleware.
 * @param appPath
 */
export const buildOpenAPIValidator = (appPath: string) => OpenApiValidator.middleware({
  apiSpec: path.join(path.resolve(appPath), "/openapi/openapi.yaml"),
  ignoreUndocumented: true,
  validateRequests: true,
  validateResponses: true,
});

/**
 * Error handler for OpenAPI validation errors.
 * @param err
 * @param _req
 * @param res
 * @param _next
 */
export const openAPIErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const errors = err.errors.map((e) => ({
    title: TITLE_MAP[e.errorCode] || e.errorCode,
    detail: `${e.path} ${e.message}`,
    status: err.status,
    console: err.stack,
  }));
  res.status(err.status ?? 500).json({
    errors,
  });
};
