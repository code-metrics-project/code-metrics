import { verbose } from "@/utils/logger";

export interface RetryOptions {
  /** Human-readable label for log messages. */
  name: string;
  /** Overall time budget in milliseconds. */
  timeout: number;
  /** Initial delay between retries in ms (default 1 000). */
  interval?: number;
  /**
   * Exponential back-off multiplier applied after each failure.
   * e.g. `2` doubles the interval on every retry: 1 s → 2 s → 4 s → …
   * The interval is capped at `maxInterval`. Leave `undefined` for a
   * fixed interval.
   */
  backoff?: number;
  /** Upper bound for the interval when using back-off (default 30 000 ms). */
  maxInterval?: number;
}

/**
 * Retries an asynchronous operation until it succeeds or the timeout is reached.
 * @param options - Options for the retry operation, including name, timeout, and interval.
 * @param operation - The asynchronous operation to retry.
 * @returns The result of the successful operation.
 * @throws An error if the operation fails after the timeout.
 */
export const retryOperationUntilTimeout = async <T>(
  options: RetryOptions,
  operation: () => Promise<T>
): Promise<T> => {
  let currentInterval = options.interval ?? 1000;
  const backoff = options.backoff ?? 1; // 1 = no growth (fixed interval)
  const maxInterval = options.maxInterval ?? 30_000;

  if (options.timeout <= 0) {
    throw new Error("Timeout must be greater than 0 ms");
  }
  verbose(
    `Retrying operation: ${options.name} with timeout ${options.timeout} ms and interval ${currentInterval} ms` +
      (backoff > 1 ? ` (backoff ×${backoff}, max ${maxInterval} ms)` : "")
  );
  const startTime = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - startTime < options.timeout) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`${options.name} failed, retrying in ${currentInterval} ms… (${lastError.message})`);
      await new Promise((resolve) => setTimeout(resolve, currentInterval));
      currentInterval = Math.min(currentInterval * backoff, maxInterval);
    }
  }

  throw new Error(`${options.name} timed out after ${options.timeout} ms. Last error: ${lastError?.message}`);
};
