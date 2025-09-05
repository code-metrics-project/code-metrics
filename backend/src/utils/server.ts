import { getConfigItem } from "../config/sources/source";

const DEFAULT_CORS_ORIGIN = "http://localhost:3001";

export const getUiBaseUrl = (): string => {
  return getConfigItem("UI_BASE_URL") ?? getCorsOrigin();
};

export const getCorsOrigin = (): string => {
  return getConfigItem("CORS_ORIGIN", DEFAULT_CORS_ORIGIN);
};
