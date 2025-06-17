import type { QueryAndResult, RawQuery } from "@/model/query";
import { OperationState } from "@/utils/ui";
import { executeQuery } from "@/services/query";
import { computed, ref } from "vue";

/**
 * Composable to run queries and manage their state.
 */
export const useQueryManager = (title: string) => {
  const allDatasets = ref<QueryAndResult[]>([]);
  const operationState = ref(OperationState.Idle);
  const groupBy = ref<string>("workloadId");

  const chartData = computed(() => {
    if (allDatasets.value.length === 0) {
      return null;
    }
    return allDatasets.value.map((d) => d.result);
  });

  const onExecute = async (rawQueries: RawQuery[]) => {
    operationState.value = OperationState.Busy;
    try {
      allDatasets.value = [];

      const queries = rawQueries.map((query) => ({
        ...query,
        groupBy: groupBy.value,
      }));

      const running = queries.map((query) => ({
        queryName: query.queryName,
        execution: executeQuery(query),
      }));

      allDatasets.value = await Promise.all(
        running.map(async ({ queryName, execution }) => {
          const result = await execution;
          return { queryName, result };
        }),
      );

      operationState.value = OperationState.Idle;
    } catch (e) {
      console.error(`Failed to run '${title}' queries`, e);
      operationState.value = OperationState.Error;
    }
  };

  return {
    allDatasets,
    operationState,
    groupBy,
    chartData,
    onExecute,
  };
};
