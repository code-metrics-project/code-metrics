import { LogQueue } from "./file";

enum Styles {
  Reset = "\x1b[0m",
  TextGreen = "\x1b[32m",
  TextRed = "\x1b[31m",
  TextYellow = "\x1b[33m",
  TextBlue = "\x1b[34m",
}

export enum LogLevel {
  OFF,
  DEBUG,
  VERBOSE,
}

// Use process.env directly here to avoid a circular dependency on the config item system
const { LOG_LEVEL, LOG_FILE_PATH } = process.env;

// Parse LOG_LEVEL from environment variable (supports both numeric strings "0", "1", "2" and enum names "OFF", "DEBUG", "VERBOSE")
const envLogLevel = LOG_LEVEL
  ? isNaN(Number(LOG_LEVEL))
    ? LogLevel[LOG_LEVEL as keyof typeof LogLevel] // Try as enum name
    : Number(LOG_LEVEL) // Parse as number
  : undefined;

let logQueue: LogQueue | undefined;

if (LOG_FILE_PATH) {
  logQueue = new LogQueue(LOG_FILE_PATH);
}

// Handle process exit to close file stream properly
process.on("exit", () => {
  logQueue?.close();
});

let overrideLevel: LogLevel | undefined;
export const overrideLogLevel = (level: LogLevel) => {
  overrideLevel = level;
};
export const resetLogLevel = () => {
  overrideLevel = undefined;
};

const getLogLevel = (): LogLevel => overrideLevel ?? envLogLevel ?? LogLevel.DEBUG;

export const isVerbose = () => getLogLevel() >= LogLevel.VERBOSE;

export const logger = (message: string, ...args) => log(message, LogLevel.DEBUG, Styles.TextGreen, ...args);
export const verbose = (message: string, ...args) => log(message, LogLevel.VERBOSE, Styles.TextBlue, ...args);
export const warn = (message: string, ...args) => log(message, LogLevel.DEBUG, Styles.TextYellow, ...args);
export const error = (message: string, ...args) => log(message, LogLevel.DEBUG, Styles.TextRed, ...args);

const log = (message: string, level: LogLevel, color: Styles, ...args) => {
  if (level > getLogLevel()) return;

  if (global.isLambda) {
    console.log(message, ...args);
  } else {
    console.log(`${color}%s${Styles.Reset}`, message, ...args);
  }

  if (logQueue) {
    const timestamp = new Date().toISOString();
    const logLevel = LogLevel[level].toUpperCase();
    const argsStr = args.length
      ? ` ${args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg)).join(" ")}`
      : "";

    const logEntry = `[${timestamp}] [${logLevel}] ${message}${argsStr}\n`;
    logQueue.enqueue(logEntry);
  }
};

// Log the current log level configuration at startup (always show this for validation)
if (!overrideLevel) {
  const currentLevel = getLogLevel();
  const levelName = LogLevel[currentLevel];
  console.log(`${Styles.TextYellow}[Logger] LOG_LEVEL=${currentLevel} (${levelName})${Styles.Reset}`);
}
