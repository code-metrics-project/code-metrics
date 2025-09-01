import { QueryComponentType } from "@/model/query";
import type { DatedMetrics } from "@/model/metrics";
import type { StoredQuery, StoredQueryCollection } from "@/model/query";
import type { ResultsSummary, ResultsSummaryItem } from "@/queries/config";
import type { QueryName } from "@/queries/queries";

export function summariseNumeric(results: Map<string, DatedMetrics>, title: string, icon: string): ResultsSummary {
  const items: Record<string, ResultsSummaryItem> = {};
  for (const data of results.values()) {
    for (const [tag, entry] of data.entries) {
      const item: ResultsSummaryItem = items[tag] || {
        title: formatTagTitle(tag),
        icon,
        value: 0,
      };
      item.value += entry.value;
      items[tag] = item;
    }
  }
  const total: ResultsSummaryItem = {
    title: "total",
    value: 0,
    icon: "mdi-equal-box",
  };
  for (const item of Object.values(items)) {
    total.value += item.value;
  }
  items["total"] = total;
  return {
    title,
    items: Object.values(items),
  };
}

function formatTagTitle(tag: string) {
  const slashIdx = tag.indexOf("/");
  return slashIdx > -1 ? tag.substring(slashIdx + 1) : tag;
}

/**
 * Convert the given query types and populated inputs into a stored query collection.
 * @param queryTypes
 * @param populatedInputs
 * @param i18nLookup the `i18n.t` lookup function
 */
export const toStoredQueryCollection = (
  queryTypes: QueryName[],
  populatedInputs: Record<string, any>,
  i18nLookup: (key: string) => string,
): Pick<StoredQueryCollection, "queries"> => {
  const description = queryTypes
    .map((queryType) => {
      return i18nLookup(`queries.title.${queryType}`);
    })
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
