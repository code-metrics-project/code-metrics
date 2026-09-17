import { QueryResultCache } from "./queryResultCache";
import { InProcessResultCache } from "./inProcessResultCache";
import { DynamoResultCache } from "./dynamoResultCache";

let instance: QueryResultCache | null = null;

/**
 * Provides the shared query result cache instance, choosing DynamoDB in Lambda
 * mode and an in-memory cache otherwise.
 */
export const provideQueryResultCache = (): QueryResultCache => {
  if (instance) {
    return instance;
  }
  if (global.isLambda && process.env.ASYNC_QUERY_RESULT_TTL) {
    instance = new DynamoResultCache();
  } else {
    instance = new InProcessResultCache();
  }
  return instance;
};

/**
 * Destroys the shared query result cache instance.
 */
export const destroyQueryResultCache = (): void => {
  if (instance && typeof instance.destroy === "function") {
    instance.destroy();
  }
  instance = null;
};
