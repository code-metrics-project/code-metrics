<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">New Query</h2>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
  <v-container>
    <v-row>
      <v-col>
        <DynamicQuery
          title="New query"
          :query-types="selectedQueries"
          @update-query="onUpdateQuery"
          :chart-type="chartType"
          :show-data-labels="showDataLabels"
        >
          <template v-slot:header>
            <v-sheet class="d-flex pa-4" color="secondary">
              <v-container class="px-0 py-0">
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-card-title class="pl-0">Build a query</v-card-title>
                    <v-card-subtitle class="pl-0 pb-1"
                      >Add one or more data sources, then filter to explore the
                      metrics.</v-card-subtitle
                    >
                  </v-col>
                  <v-col cols="12" sm="6">
                    <QueryPicker
                      multiple
                      :operationState="operationState"
                      @update-query="(queries) => (selectedQueries = queries)"
                    />
                  </v-col>
                </v-row>
              </v-container>
            </v-sheet>
          </template>
          <template v-slot:menuItems>
            <QueryEditor
              show-save
              :collection="collection"
              :operation-state="operationState"
              @operation-state-changed="(state) => (operationState = state)"
              @save-query="() => (queryNameDialog = true)"
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
    </v-row>
  </v-container>

  <QueryNameDialog
    :active="queryNameDialog"
    :collection="collection"
    @operation-state-changed="(state) => (operationState = state)"
    @dismissed="queryNameDismissed"
  />
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { Paths } from "@/router/paths";
import QueryPicker from "@/components/query/QueryPicker.vue";
import ChartSelector from "@/components/charts/ChartSelector.vue";
import { OperationState } from "@/utils/ui";
import { type QueryName } from "@/queries/queries";
import type { StoredQueryCollection } from "@/model/query";
import QueryEditor from "@/components/query/QueryEditor.vue";
import DynamicQuery from "@/components/DynamicQuery.vue";
import QueryNameDialog from "@/components/query/QueryNameDialog.vue";
import { useRouter } from "vue-router";
import { ChartType } from "@/chart/chart-types";

const router = useRouter();

const chartType = ref(ChartType.MultiChart);
const operationState = ref(OperationState.Idle);
const selectedQueries = ref([] as QueryName[]);
const collection = ref<StoredQueryCollection>();
const showDataLabels = ref(false);
const queryNameDialog = ref(false);

const items = [
  {
    title: "Explore",
    to: Paths.Explore,
  },
  {
    title: "New Query",
    to: Paths.NewQuery,
  },
];

const onUpdateQuery = (updated: StoredQueryCollection) => {
  collection.value = updated;
};

const queryNameDismissed = async (
  updatedCollection?: StoredQueryCollection,
) => {
  queryNameDialog.value = false;

  if (!updatedCollection) {
    return;
  }

  // store the chart type
  updatedCollection.queries.forEach((query) => {
    const render = query.render || {};
    render.chartType = chartType.value;
    query.render = render;
  });

  collection.value = updatedCollection;

  if (updatedCollection?.id) {
    await router.push({
      path: `${Paths.SavedQueries}/${updatedCollection.id}`,
    });
  }
};
</script>
