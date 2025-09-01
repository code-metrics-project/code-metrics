const REDACTED_FIELDS = ["apiKey", "clientSecret", "password", "refreshToken"];

/**
 * Redacts sensitive fields in an object and returns a JSON string representation.
 * @param obj
 */
export const redactAndRenderAsJson = (obj: any): string => {
  let json = JSON.stringify(obj, null, 2);
  for (const field of REDACTED_FIELDS) {
    json = json.replace(new RegExp('"' + field + '": "[^"]*"', "g"), '"' + field + '": "*****"');
  }
  return json;
};
