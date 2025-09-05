import { getConfigItemAsBoolean } from "../config/sources/source";

export const isStrictMode = (): boolean => {
  return getConfigItemAsBoolean("STRICT_CONFIG_LOAD");
};
