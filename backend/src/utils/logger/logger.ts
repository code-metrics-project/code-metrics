import { LogQueue } from "./file";
import { getConfigItem } from "../../config/sources/source";

enum Styles {
  Reset = "\x1b[0m",
  TextGreen = "\x1b[32m",
  TextRed = "\x1b[31m",
  TextYellow = "\x1b[33m",
  TextBlue = "\x1b[34m",
}

export enum LogLevel {
  Off,
  Debug,
  Verbose,
}

const { LOG_LEVEL, LOG_FILE_PATH } = {
  LOG_LEVEL: getConfigItem("LOG_LEVEL"),
  LOG_FILE_PATH: getConfigItem("LOG_FILE_PATH"),
};
const envLogLevel = LOG_LEVEL && LogLevel[LOG_LEVEL as keyof typeof LogLevel];

let logQueue: LogQueue | undefined;

if (LOG_FILE_PATH) {
  logQueue = new LogQueue(LOG_FILE_PATH);
}

// Handle process exit to close file stream properly
process.on("exit", () => {
  logQueue?.close();
});

let overrideLevel: LogLevel;
export const overrideLogLevel = (level: LogLevel) => {
  overrideLevel = level;
};

const getLogLevel = (): LogLevel => overrideLevel ?? envLogLevel ?? LogLevel.Debug;

export const isVerbose = () => getLogLevel() >= LogLevel.Verbose;

export const logger = (message: string, ...args) => log(message, LogLevel.Debug, Styles.TextGreen, ...args);
export const verbose = (message: string, ...args) => log(message, LogLevel.Verbose, Styles.TextBlue, ...args);
export const warn = (message: string, ...args) => log(message, LogLevel.Debug, Styles.TextYellow, ...args);
export const error = (message: string, ...args) => log(message, LogLevel.Debug, Styles.TextRed, ...args);

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
