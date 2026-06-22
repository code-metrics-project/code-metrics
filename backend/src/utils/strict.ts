import { getEnvConfigItemAsBoolean } from "../config/sources/source";

export const isStrictMode = (): boolean => {
  return getEnvConfigItemAsBoolean("STRICT_CONFIG_LOAD");
};
