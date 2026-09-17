import { QueryQueue } from "./queryQueue";
import { InProcessQueue } from "./inProcessQueue";
import { SqsQueue } from "./sqsQueue";

let instance: QueryQueue | null = null;

/**
 * Provides the shared query queue instance, choosing SQS in Lambda mode and an
 * in-process queue otherwise.
 */
export const provideQueryQueue = (): QueryQueue => {
  if (instance) {
    return instance;
  }
  if (global.isLambda && process.env.ASYNC_QUERY_QUEUE_URL) {
    instance = new SqsQueue();
  } else {
    instance = new InProcessQueue();
  }
  return instance;
};

/**
 * Destroys the shared query queue instance.
 */
export const destroyQueryQueue = (): void => {
  if (instance && typeof instance.destroy === "function") {
    instance.destroy();
  }
  instance = null;
};
