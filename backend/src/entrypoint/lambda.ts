import serverlessExpress from "@codegenie/serverless-express";
import type { SQSEvent } from "aws-lambda";
import { InvocationMode } from "./model";
import { startup } from "./startup";
import { verbose, warn } from "../utils/logger/logger";
import { queryExecution } from "./query";
import path from "path";
import { overrideConfigItem } from "../config/sources/source";

let serverlessExpressInstance;

export const detectIfLambda = (): boolean => {
  // use process.env directly as this is used to detect lambda environment, not set by config sources
  const lambdaTaskRoot = process.env.LAMBDA_TASK_ROOT;
  if (lambdaTaskRoot?.length) {
    overrideConfigItem("CONFIG_DIR", path.join(lambdaTaskRoot, "config"));
    verbose("Running in AWS Lambda environment with task root:", lambdaTaskRoot);
    return true;
  }
  return false;
};

export const buildLambdaHandler = (invocationMode: InvocationMode) => {
  switch (invocationMode) {
    case InvocationMode.ExecuteQuery:
      return async (event: SQSEvent) => {
        await startup(invocationMode, true);
        return await queryExecution(event);
      };

    case InvocationMode.ServeApi:
      return async (event, context) => {
        verbose("event", event);
        if (!serverlessExpressInstance) {
          // only invoke startup once
          const app = await startup(invocationMode, true);
          serverlessExpressInstance = serverlessExpress({ app });
        }
        return serverlessExpressInstance(event, context);
      };

    case InvocationMode.UpdateCache:
      return async (event, context) => {
        await startup(invocationMode, true);
        return { statusCode: 200, body: "Cache updated" };
      };

    default:
      warn(`Unsupported Lambda invocation mode: ${invocationMode}`);
      return null;
  }
};
