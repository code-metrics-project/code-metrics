import { getEnvConfigItemAsBoolean } from "../config/sources/source";

export const ACCESS_LOGS_CONFIG_KEY = "LOG_ACCESS_LOGS";

export const areAccessLogsEnabled = (): boolean => {
  return getEnvConfigItemAsBoolean(ACCESS_LOGS_CONFIG_KEY, true);
};
