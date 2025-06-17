const DEFAULT_CORS_ORIGIN = "http://localhost:3001";

export const getUiBaseUrl = (): string => {
  return process.env.UI_BASE_URL ?? getCorsOrigin();
}

export const getCorsOrigin = (): string => {
  return process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN;
}
