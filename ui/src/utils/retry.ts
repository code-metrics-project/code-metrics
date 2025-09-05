import { verbose } from "@/utils/logger.ts";

/**
 * Retries an asynchronous operation until it succeeds or the timeout is reached.
 * @param options - Options for the retry operation, including name, timeout, and interval.
 * @param operation - The asynchronous operation to retry.
 * @returns The result of the successful operation.
 * @throws An error if the operation fails after the timeout.
 */
export const retryOperationUntilTimeout = async <T>(
  options: {
    name: string;
    timeout: number;
    interval?: number;
  },
  operation: () => Promise<T>,
): Promise<T> => {
  options.interval = options.interval ?? 1000; // Default interval to 1000 ms if not provided
  if (options.timeout <= 0) {
    throw new Error("Timeout must be greater than 0 ms");
  }
  verbose(`Retrying operation: ${options.name} with timeout ${options.timeout} ms and interval ${options.interval} ms`);
  const startTime = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - startTime < options.timeout) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`${options.name} failed, retrying... (${lastError.message})`);
      await new Promise((resolve) => setTimeout(resolve, options.interval));
    }
  }

  throw new Error(`${options.name} timed out after ${options.timeout} ms. Last error: ${lastError?.message}`);
};
