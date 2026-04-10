import type { StoredQuery, StoredQueryCollection } from "@/model/query";
import { QueryComponentType } from "@/model/query";

/**
 * Map of query types to their human-readable titles.
 */
const queryTitles: Record<string, string> = {
  "bugs-new": "New bugs",
  "bugs-open": "Open bugs",
  "change-failure-rate": "Change failure rate",
  "change-categories": "Change categories",
  "code-coverage": "Code coverage",
  coverage: "Coverage",
  "cyclomatic-complexity": "Cyclomatic complexity",
  "deployment-frequency": "Deployment frequency",
  "lead-time-for-changes": "Lead time for changes",
  "lines-of-code": "Lines of code",
  "non-working-pattern": "Working pattern",
  "pipeline-runs": "Pipeline runs",
  "pipeline-success": "Pipeline success rate",
  "pipeline-durations": "Pipeline durations",
  "production-incidents": "Production incidents",
  "pr-open-time": "PR open time",
  "pr-size": "PR size",
  "repo-churn": "Repository churn",
  "time-to-restore-service": "Time to restore service",
  vulnerabilities: "Vulnerabilities",
};

/**
 * Get the human-readable title for a query type.
 */
export function getQueryTitle(queryType: string): string {
  return queryTitles[queryType] ?? queryType;
}

/**
 * Convert the given query types and populated inputs into a stored query collection.
 * @param queryTypes - Array of query type names
 * @param populatedInputs - The populated input values
 */
export const toStoredQueryCollection = (
  queryTypes: string[],
  populatedInputs: Record<string, unknown>
): Pick<StoredQueryCollection, "queries"> => {
  const description = queryTypes
    .map((queryType) => getQueryTitle(queryType))
    .map((queryTitle, index) => {
      if (index === 0) {
        return queryTitle;
      } else if (index === queryTypes.length - 1) {
        return ` and ${queryTitle}`;
      } else {
        return `, ${queryTitle}`;
      }
    })
    .join("");

  const query: StoredQuery = {
    name: "Saved query",
    description,
    component: QueryComponentType.DynamicInput,
    props: {
      queryTypes: queryTypes,
      defaultInputs: populatedInputs,
    },
  };

  const collection = {
    queries: [query],
  };
  console.debug("Updated query collection", collection);
  return collection;
};

/**
 * Generate a URL-safe ID from a title.
 * Normalizes the title to lowercase, replaces spaces with hyphens,
 * and removes non-alphanumeric characters.
 */
export const generateIdFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/\s/g, "-")
    .replace(/[^a-z0-9-]/g, "");
};
