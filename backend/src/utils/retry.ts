import Bottleneck from "bottleneck";
import { getConfigItemAsNumber } from "../config/sources/source";
import { warn } from "../utils/logger/logger.js";

const API_RETRY_LIMIT = getConfigItemAsNumber("API_RETRY_LIMIT", 5);

/**
 * Limit the concurrency of a function using a Bottleneck instance.
 * @param limiter
 * @param callback
 */
export const limitConcurrency = async <R>(limiter: Bottleneck, callback: () => Promise<R>): Promise<R> => {
  return limitConcurrencyAndRetry(limiter, callback, 1);
};

/**
 * Limit the concurrency of a function using a Bottleneck instance and retry on failure.
 * @param limiter
 * @param callback
 * @param attempts
 */
export const limitConcurrencyAndRetry = async <R>(
  limiter: Bottleneck,
  callback: () => Promise<R>,
  attempts = API_RETRY_LIMIT,
): Promise<R> => {
  return limiter.schedule(() => retry(callback, attempts));
};

/**
 * Retry a function on failure.
 * @param callback
 * @param remainingRetries
 */
export const retry = async <R>(callback: () => Promise<R>, remainingRetries = API_RETRY_LIMIT): Promise<R> => {
  try {
    return await callback();
  } catch (err) {
    if (remainingRetries <= 0) {
      throw new Error(`Failed retrying execution - ${err}`);
    } else {
      warn(`API call reset, retrying: ${callback}, remaining: ${remainingRetries - 1}`, err);
      return retry(callback, remainingRetries - 1);
    }
  }
};
