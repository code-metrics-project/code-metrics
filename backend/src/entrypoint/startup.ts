import { overrideConfigItem } from "../config/sources/source";
import { InvocationMode } from "./model";
import { startApi } from "./api";
import { bootstrap } from "./bootstrap";
import { registerQueries } from "../queries/queries";
import { registerTransforms } from "../transforms/transforms";

export const startup = async (invocationMode: InvocationMode, isLambda: boolean = false) => {
  switch (invocationMode) {
    case InvocationMode.DesktopMode:
    case InvocationMode.ServeApi:
      await bootstrap();
      return await startApi(invocationMode, isLambda);
    case InvocationMode.ExecuteQuery:
      // The query and transform registries are otherwise only populated by
      // the HTTP API entrypoint, so they must be registered here for the
      // async query execution Lambda.
      registerQueries();
      registerTransforms();
      await bootstrap();
      break;
    case InvocationMode.UpdateCache:
      overrideConfigItem("PRECACHE_REPO_LIST", "true");
      await bootstrap();
      break;
    default:
      throw new Error(`Invalid invocation mode: ${invocationMode}`);
  }
};
