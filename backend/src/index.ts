import { logger, error } from "./utils/logger/logger";
import { InvocationMode } from "./entrypoint/model";
import { getConfigItem } from "./config/sources/source";
import { buildLambdaHandler, detectIfLambda } from "./entrypoint/lambda";
import { startup } from "./entrypoint/startup";

declare global {
  var isLambda: boolean;
  var invocationMode: InvocationMode;
}

const main = () => {
  const invocationMode = getConfigItem("INVOCATION_MODE", InvocationMode.ServeApi) as InvocationMode;
  global.invocationMode = invocationMode;

  const isLambda = detectIfLambda();
  global.isLambda = isLambda;

  logger("Invocation mode:", invocationMode);

  if (isLambda) {
    const lambdaHandler = buildLambdaHandler(invocationMode);
    if (lambdaHandler) {
      exports.handler = lambdaHandler;
    } else {
      error(`Failed to build Lambda handler for invocation mode: ${invocationMode}`);
      process.exit(1);
    }
  } else {
    require("log-timestamp");
    startup(invocationMode).catch((reason) => {
      error("Failed to start server", reason);
      process.exit(1);
    });
  }
};

main();
