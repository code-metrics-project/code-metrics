/**
 * Deep merge objects. Properties in later objects override earlier ones.
 * This is a simplified version that handles nested objects.
 */
export const deepMerge = <T extends Record<string, unknown>>(...objects: Partial<T>[]): T => {
  const result = {} as T;

  for (const obj of objects) {
    if (!obj) continue;
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          typeof result[key] === "object" &&
          result[key] !== null &&
          !Array.isArray(result[key])
        ) {
          result[key] = deepMerge(
            result[key] as Record<string, unknown>,
            value as Record<string, unknown>
          ) as T[typeof key];
        } else {
          result[key] = value as T[typeof key];
        }
      }
    }
  }

  return result;
};
