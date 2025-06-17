<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">{{ collection?.title }}</h2>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
  <v-container>
    <v-row v-for="q in queries" :key="q.props?.title">
      <v-col v-if="q.component === QueryComponentType.DynamicInput">
        <DynamicQuery
          v-bind="q.props"
          @update-query="onUpdateQuery"
          :chart-type="chartType"
          :show-data-labels="showDataLabels"
        >
          <template v-slot:menuItems>
            <QueryEditor
              show-save
              show-delete
              :collection="collection"
              :operation-state="operationState"
              @operation-state-changed="(state) => (operationState = state)"
              @save-query="onSaveQuery"
              @delete-query="deleteQuery"
            />
            <v-divider />
            <v-list-item class="px-2 py-0 my-0">
              <v-checkbox v-model="showDataLabels" hide-details>
                <template v-slot:label>Show data labels</template>
              </v-checkbox>
            </v-list-item>
            <v-list-item>
              <ChartSelector
                :chart-type="chartType"
                :operation-state="operationState"
                @input="(updated) => (chartType = updated)"
              />
            </v-list-item>
          </template>
        </DynamicQuery>
      </v-col>
      <v-col
        v-else-if="q.component === QueryComponentType.CodeAnalysisMetricSummary"
      >
        <CodeAnalysisAggregate v-bind="q.props" />
      </v-col>
      <v-col
        v-else-if="q.component === QueryComponentType.FileCoverageBreakdown"
      >
        <FileMetricBreakdown v-bind="q.props" />
      </v-col>
      <v-col v-else>
        <v-card>
          <v-alert type="warning">Unknown component: {{ q.component }}</v-alert>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Paths } from "@/router/paths";
import DynamicQuery from "@/components/DynamicQuery.vue";
import CodeAnalysisAggregate from "@/components/CodeAnalysisAggregate.vue";
import FileMetricBreakdown from "@/components/FileMetricBreakdown.vue";
import {
  deleteQueryCollection,
  getQueryCollection,
  saveQueryCollection,
} from "@/queries/stored";
import {
  QueryComponentType,
  type StoredQuery,
  type StoredQueryCollection,
} from "@/model/query";
import QueryEditor from "@/components/query/QueryEditor.vue";
import ChartSelector from "@/components/charts/ChartSelector.vue";
import { OperationState } from "@/utils/ui";
import { useDialogStore } from "@/store/dialog";
import { useToastStore } from "@/store/toast";
import { ChartType } from "@/chart/chart-types";

const router = useRouter();
const route = useRoute();

const collectionId = computed((): string => {
  return route.params.collectionId as string;
});

const DEFAULT_CHART_TYPE = ChartType.MultiChart;

const operationState = ref(OperationState.Idle);
const collection = ref<StoredQueryCollection>();
const queries = ref<StoredQuery[]>();
const chartType = ref(DEFAULT_CHART_TYPE);
const showDataLabels = ref(false);

const dialogStore = useDialogStore();
const toastStore = useToastStore();

onMounted(async () => {
  const col = await getQueryCollection(collectionId.value);
  if (!col) {
    return;
  }
  collection.value = col;

  queries.value = col.queries?.map((q) => {
    return {
      component: q.component,
      name: q.name,
      props: {
        title: q.name,
        subtitle: q.description,
        ...q.props,
      },
    };
  });

  // prepopulate the chart type
  if (col.queries.length) {
    chartType.value = col.queries[0]?.render?.chartType || DEFAULT_CHART_TYPE;
  }
});

const onUpdateQuery = (updated: StoredQueryCollection) => {
  const col = {
    ...updated,

    // retain the id and title
    id: collection.value?.id,
    title: collection.value?.title,
  };

  collection.value = col;
};

const onSaveQuery = async () => {
  const col = collection.value;
  if (!col?.id) {
    console.error("No collection to save");
  } else {
    try {
      operationState.value = OperationState.Busy;

      // store the chart type
      col.queries.forEach((query) => {
        const render = query.render || {};
        render.chartType = chartType.value;
        query.render = render;
      });

      await saveQueryCollection(col);
      toastStore.push({
        text: "Query collection saved.",
      });
      operationState.value = OperationState.Idle;
    } catch (e) {
      operationState.value = OperationState.Error;
    }
  }
};

const deleteQuery = () => {
  dialogStore.push({
    title: "Delete query",
    subtitle: "Are you sure you want to delete this query collection?",
    confirmTitle: "Delete",
    onDismiss: onDismissDeleteDialog,
  });
};

const onDismissDeleteDialog = async (confirm: boolean) => {
  if (!confirm) {
    return;
  }
  const col = collection.value;
  if (!col?.id) {
    return;
  }

  try {
    operationState.value = OperationState.Busy;
    await deleteQueryCollection(collection.value.id);
    toastStore.push({
      text: "Query collection deleted.",
    });
    operationState.value = OperationState.Idle;
    await router.push({ path: Paths.SavedQueries });
  } catch (e) {
    console.error("Failed to delete query collection", e);
    operationState.value = OperationState.Error;
  }
};

const items = computed(() => [
  {
    title: "Explore",
    to: Paths.Explore,
  },
  {
    title: "Saved Queries",
    to: Paths.SavedQueries,
  },
  {
    title: collection.value?.title,
    to: `${Paths.SavedQueries}/${collection.value?.id}`,
  },
]);
</script>
