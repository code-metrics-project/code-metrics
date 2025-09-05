enum LogLevel {
  Off,
  Debug,
  Verbose,
}

let logLevel: LogLevel;

export function setLogLevel(level?: LogLevel) {
  logLevel = level ?? LogLevel.Debug;
}

function logger(message: string, ...args: any[]) {
  log(message, LogLevel.Debug, ...args);
}

function verbose(message: string, ...args: any[]) {
  log(message, LogLevel.Verbose, ...args);
}

function log(message: string, level: LogLevel, ...args: any[]) {
  if (level > logLevel) {
    return;
  }
  console.log(message, ...args);
}

export { logger, verbose };
