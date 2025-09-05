import { bootstrap, startApi } from "./app";
import serverlessExpress from "@codegenie/serverless-express";
import { error, verbose } from "./utils/logger/logger";
import { InvocationMode } from "./model/global";
import { getConfigItem, overrideConfigItem } from "./config/sources/source";
import path from "path";

global.invocationMode = (getConfigItem("INVOCATION_MODE") as InvocationMode) ?? InvocationMode.ServeApi;

// use process.env directly as this is used to detect lambda environment, not set by config sources
const lambdaTaskRoot = process.env.LAMBDA_TASK_ROOT;
if (lambdaTaskRoot?.length) {
  global.isLambda = true;
  overrideConfigItem("CONFIG_DIR", path.join(lambdaTaskRoot, "config"));
  verbose("Running in AWS Lambda environment with task root:", lambdaTaskRoot);
} else {
  global.isLambda = false;
}

let serverlessExpressInstance;

const startup = async () => {
  switch (global.invocationMode) {
    case InvocationMode.UpdateCache:
      overrideConfigItem("PRECACHE_REPO_LIST", "true");
      await bootstrap();
      break;
    case InvocationMode.DesktopMode:
    case InvocationMode.ServeApi:
      await bootstrap();
      return await startApi();
    default:
      throw new Error("Invalid invocation mode");
  }
};

console.log("Invocation mode:", global.invocationMode);

if (global.isLambda) {
  switch (global.invocationMode) {
    case InvocationMode.UpdateCache:
      exports.handler = async (event, context) => {
        await startup();
        return { statusCode: 200, body: "Cache updated" };
      };
      break;

    case InvocationMode.ServeApi:
      exports.handler = async (event, context) => {
        verbose("event", event);
        if (!serverlessExpressInstance) {
          const app = await startup();
          serverlessExpressInstance = serverlessExpress({ app });
        }
        return serverlessExpressInstance(event, context);
      };
      break;

    default:
      console.error("Invalid invocation mode", global.invocationMode);
      process.exit(1);
  }
} else {
  require("log-timestamp");
  startup().catch((reason) => {
    error("Failed to start server", reason);
    process.exit(1);
  });
}
