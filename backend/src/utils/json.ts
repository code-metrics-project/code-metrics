import { JSONPath } from "jsonpath-plus";

/**
 * Returns the result of a JSON path query. If multiple results are found, the first one is returned.
 * If no results are found, null is returned.
 * @param json
 * @param path
 */
export const jsonPathQuery = (json: any, path: string): any => {
  const result = JSONPath({ path, json });
  return result.length ? result[0] : null;
};
