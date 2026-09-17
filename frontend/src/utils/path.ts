/**
 * Build a path from a path property, substituting `:param` segments with
 * matching values and appending any remaining values as query parameters.
 *
 * Falsy values are omitted. Path and query values are URI-encoded.
 */
export const buildPath = (pathProperty: string, params: Record<string, string | undefined | null> = {}): string => {
  let path = pathProperty.startsWith("/") ? pathProperty : `/${pathProperty}`;
  const queryParts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (!value) {
      continue;
    }
    const paramPattern = new RegExp(`:${key}(?![a-zA-Z0-9])`, "g");
    const substituted = path.replace(paramPattern, () => encodeURIComponent(value));
    if (substituted !== path) {
      path = substituted;
    } else {
      queryParts.push(`${key}=${encodeURIComponent(value)}`);
    }
  }

  return `${path}${queryParts.length > 0 ? `?${queryParts.join("&")}` : ""}`;
};
