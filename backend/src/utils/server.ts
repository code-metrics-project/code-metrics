import { getEnvConfigItem } from "../config/sources/source";

const DEFAULT_CORS_ORIGIN = "http://localhost:3001";

export const getUiBaseUrl = (): string => {
  return getEnvConfigItem("UI_BASE_URL") ?? getCorsOrigin();
};

export const getCorsOrigin = (): string => {
  return getEnvConfigItem("CORS_ORIGIN", DEFAULT_CORS_ORIGIN);
};
