import http from "http";
import path from "path";
import crypto from "crypto";
import { app } from "electron";
import { logger } from "./logger";

export function getResourcesPath() {
  const appPath = app.getAppPath();
  logger("App path:", appPath);

  if (process.platform === "darwin") {
    // macOS: SomeApp.app/Contents/Resources
    return path.join(appPath.replaceAll("/app.asar", ""), "../../Contents/Resources");
  } else {
    // Linux & Windows: resources folder is a sibling to the app directory
    return path.join(appPath, "../../resources");
  }
}

/**
 * Waits for a specific URL to become available within a given timeout period.
 * This function repeatedly checks the URL and resolves when it receives a valid response.
 * If the URL does not respond within the timeout, it rejects with an error.
 *
 * @param name - A descriptive name for the service being waited on (used in logs).
 * @param url - The URL to check for availability.
 * @param timeoutMs - The maximum time to wait for the URL (default is 10,000 ms).
 * @returns A promise that resolves when the URL is ready or rejects if it times out.
 */
export function waitForUrl(name: string, url: string, timeoutMs = 10000): Promise<void> {
  logger(`Waiting for ${name} at ${url}...`);
  const start = Date.now();
  let resolved = false;

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          if (!resolved) {
            resolved = true;
            logger(`${name} is ready.`);
            resolve();
          }
        } else {
          retry();
        }
      });

      req.on("error", retry);
      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (resolved) return;
      if (Date.now() - start > timeoutMs) {
        if (!resolved) {
          resolved = true;
          reject(new Error(`${name} did not respond in time.`));
        }
        return;
      }
      setTimeout(check, 300);
    };

    check();
  });
}

/**
 * Generates a random string of the specified length using cryptographic randomness.
 * @param length
 */
export const generateRandomString = (length: number): string => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
};
