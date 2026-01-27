/**
 * Build a path with query parameters, starting from a {@link Path} property.
 */
export const buildPath = (
  pathProperty: string,
  queryParams: Record<string, string | undefined | null> = {},
): string => {
  const path = pathProperty.startsWith("/") ? pathProperty : `/${pathProperty}`;
  const query = Object.keys(queryParams)
    .filter((key) => queryParams[key])
    .map((key) => `${key}=${encodeURIComponent(queryParams[key]!)}`)
    .join("&");
  return `${path}${query ? `?${query}` : ""}`;
};
