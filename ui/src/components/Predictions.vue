<template>
  <v-card>
    <v-card-title>Predict values <v-chip color="blue" outlined small class="ml-2">Experimental</v-chip></v-card-title>
    <v-card-subtitle>Trains a model on two or more datasets, then makes predictions.</v-card-subtitle>

    <v-sheet class="d-flex align-center pa-4" color="accent">
      <v-container fluid>
        <v-row>
          <v-col>
            <div>Choose the queries to train the model.</div>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <QueryPicker
              label="Input queries"
              multiple
              deletable-chips
              v-model="inputQueriesModel"
              :operationState="operationState"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <QueryPicker label="Label query" v-model="labelQueryModel" :operationState="operationState" />
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-card-text>
      <DynamicInputs
        @execute="onQuery"
        :operation-state="operationState"
        query-name="Prediction"
        :query-types="queryTypes"
      />
    </v-card-text>

    <MultiChart v-if="Object.keys(chartData).length" :chart-data="chartData" />
  </v-card>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { computed, ref } from "vue";
import { uniq } from "lodash";
import DynamicInputs from "@/components/DynamicInputs.vue";
import QueryPicker from "@/components/query/QueryPicker.vue";
import MultiChart from "@/components/charts/MultiChart.vue";
import { convertMetricsObjToMap, getMetricsMetadata } from "@/utils/metrics";
import { predict } from "@/services/prediction";
import { QueryName } from "@/queries/queries";
import { createMultiChartDatasets } from "@/chart/multichart";
import { OperationState } from "@/utils/ui";

const chartData = ref({});
const inputQueriesModel = ref([QueryName.CodeCoverage]);
const labelQueryModel = ref(QueryName.BugsOpen);
const operationState = ref(OperationState.Idle);

async function onQuery(queries) {
  operationState.value = OperationState.Busy;
  try {
    chartData.value = {};

    const inputQueries = queries.filter((q) => inputQueriesModel.value.includes(q.queryName));
    const labelQuery = queries.find((q) => q.queryName === labelQueryModel.value);
    const responseData = await predict(inputQueries, labelQuery);

    const allDatasets = Object.values(responseData).map((metrics) => {
      return convertMetricsObjToMap(metrics);
    });

    const labelResult = convertMetricsObjToMap(responseData[labelQueryModel.value]);
    const maxLabelResult = getMetricsMetadata(labelResult, (entry) => entry.value).max;
    const overrides = { prediction: { min: 0, max: maxLabelResult } };

    chartData.value = createMultiChartDatasets(allDatasets, overrides);
    operationState.value = OperationState.Idle;
  } catch (error) {
    operationState.value = OperationState.Error;
    console.error("Failed to run prediction queries", error);
  }
}

const queryTypes = computed(() => {
  const allQueries = [...inputQueriesModel.value];
  if (labelQueryModel.value) {
    allQueries.push(labelQueryModel.value);
  }
  return uniq(allQueries);
});
</script>
