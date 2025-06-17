/**
 * Logs a message to the console with a '[desktop]' prefix.
 * @param message The main message to log.
 * @param args Optional additional arguments to log.
 */
export function logger(message: string, ...args: any[]) {
  console.log("[desktop] " + message, ...args);
}

/**
 * Logs a warning to the console with a '[desktop]' prefix.
 * @param message The warning message to log.
 * @param args Optional additional arguments to log.
 */
export function warn(message: string, ...args: any[]) {
  console.warn("[desktop] " + message, ...args);
}

/**
 * Logs an error to the console with a '[desktop]' prefix.
 * @param message The error message to log.
 * @param args Optional additional arguments to log.
 */
export function error(message: string, ...args: any[]) {
  console.error("[desktop] " + message, ...args);
}
