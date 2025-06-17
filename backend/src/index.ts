import { bootstrap, startApi } from "./app";
import serverlessExpress from "@codegenie/serverless-express";
import { error, verbose } from "./utils/logger/logger";
import { InvocationMode } from "./model/global";

global.invocationMode = process.env.INVOCATION_MODE as InvocationMode ?? InvocationMode.ServeApi;
global.isLambda = !!process.env.LAMBDA_TASK_ROOT;

let serverlessExpressInstance;

const startup = async () => {
  switch (global.invocationMode) {
    case InvocationMode.UpdateCache:
      process.env.PRECACHE_REPO_LIST = "true";
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
  process.env.CONFIG_DIR = "/var/task/config";

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
