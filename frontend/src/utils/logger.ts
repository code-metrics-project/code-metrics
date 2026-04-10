enum LogLevel {
  Off,
  Debug,
  Verbose,
}

let logLevel: LogLevel = LogLevel.Debug;

export function setLogLevel(level?: LogLevel) {
  logLevel = level ?? LogLevel.Debug;
}

export function logger(message: string, ...args: unknown[]) {
  log(message, LogLevel.Debug, ...args);
}

export function verbose(message: string, ...args: unknown[]) {
  log(message, LogLevel.Verbose, ...args);
}

function log(message: string, level: LogLevel, ...args: unknown[]) {
  if (level > logLevel) {
    return;
  }
  console.log(message, ...args);
}
