import type { QueryArgs } from "@/components/inputs";
import type { StoredQuery, StoredQueryCollection } from "@/model/query";
import { QueryComponentType } from "@/model/query";
import i18n from "@/i18n";

const queryTitleI18nKeys: Record<string, string> = {
  "bugs-new": "components:query.queryTypes.bugsNew",
  "bugs-open": "components:query.queryTypes.bugsOpen",
  "change-failure-rate": "components:query.queryTypes.changeFailureRate",
  "change-categories": "components:query.queryTypes.changeCategories",
  "code-coverage": "components:query.queryTypes.codeCoverage",
  coverage: "components:query.queryTypes.codeCoverage",
  "cyclomatic-complexity": "components:query.queryTypes.cyclomaticComplexity",
  "deployment-frequency": "components:query.queryTypes.deploymentFrequency",
  "lead-time-for-changes": "components:query.queryTypes.leadTimeForChanges",
  "lines-of-code": "components:query.queryTypes.linesOfCode",
  "non-working-pattern": "components:query.queryTypes.nonWorkingPattern",
  "pipeline-runs": "components:query.queryTypes.pipelineRuns",
  "pipeline-success": "components:query.queryTypes.pipelineSuccess",
  "pipeline-durations": "components:query.queryTypes.pipelineDurations",
  "production-incidents": "components:query.queryTypes.productionIncidents",
  "pr-open-time": "components:query.queryTypes.prOpenTime",
  "pr-size": "components:query.queryTypes.prSize",
  "prs-per-issue": "components:query.queryTypes.prsPerIssue",
  "issues-per-pr": "components:query.queryTypes.issuesPerPr",
  "repo-churn": "components:query.queryTypes.repoChurn",
  "time-to-restore-service": "components:query.queryTypes.timeToRestoreService",
  vulnerabilities: "components:query.queryTypes.vulnerabilities",
};

/**
 * Get the human-readable title for a query type.
 */
export function getQueryTitle(queryType: string): string {
  const i18nKey = queryTitleI18nKeys[queryType];
  if (!i18nKey) {
    return queryType;
  }

  return i18n.t(i18nKey);
}

/**
 * Convert the given query types and populated inputs into a stored query collection.
 * @param queryTypes - Array of query type names
 * @param populatedInputs - The populated input values
 */
export const toStoredQueryCollection = (
  queryTypes: string[],
  populatedInputs: QueryArgs
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
