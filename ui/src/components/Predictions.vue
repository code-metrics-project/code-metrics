<template>
  <v-card>
    <v-card-title
      >Predict values
      <v-chip color="blue" outlined small class="ml-2"
        >Experimental</v-chip
      ></v-card-title
    >
    <v-card-subtitle
      >Trains a model on two or more datasets, then makes
      predictions.</v-card-subtitle
    >

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
              :default="inputQueries"
              multiple
              deletable-chips
              @input="onInputQueriesUpdated"
              :operationState="operationState"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <QueryPicker
              label="Label query"
              :default="labelQuery"
              @input="onLabelQueryUpdated"
              :operationState="operationState"
            />
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

<script lang="ts">
// @ts-nocheck
import DynamicInputs from "@/components/DynamicInputs.vue";
import QueryPicker from "@/components/query/QueryPicker.vue";
import { OperationState } from "@/utils/ui";
import MultiChart from "@/components/charts/MultiChart.vue";
import { convertMetricsObjToMap, getMetricsMetadata } from "@/utils/metrics";
import { predict } from "@/services/prediction";
import { QueryName } from "@/queries/queries";
import { uniq } from "lodash";
import { createMultiChartDatasets } from "@/chart/multichart";

export default {
  name: "Predictions",
  components: {
    DynamicInputs,
    QueryPicker,
    MultiChart,
  },
  methods: {
    onInputQueriesUpdated(queryNames) {
      this.inputQueries = queryNames;
    },
    onLabelQueryUpdated(queryName) {
      this.labelQuery = queryName;
    },
    async onQuery(queries) {
      this.operationState = OperationState.Busy;
      try {
        this.chartData = {};

        const inputQueries = queries.filter((q) =>
          this.inputQueries.includes(q.queryName),
        );
        const labelQuery = queries.find((q) => q.queryName === this.labelQuery);
        const responseData = await predict(inputQueries, labelQuery);

        const allDatasets = Object.values(responseData).map((metrics) => {
          return convertMetricsObjToMap(metrics);
        });

        const labelResult = convertMetricsObjToMap(
          responseData[this.labelQuery],
        );
        const maxLabelResult = getMetricsMetadata(
          labelResult,
          (entry) => entry.value,
        ).max;
        const overrides = { prediction: { min: 0, max: maxLabelResult } };

        this.chartData = createMultiChartDatasets(allDatasets, overrides);
        this.operationState = OperationState.Idle;
      } catch (error) {
        console.error("Failed to run prediction queries", error);
        this.operationState = OperationState.Error;
      }
    },
  },
  data() {
    return {
      chartData: {},
      operationState: OperationState.Idle,
      inputQueries: [QueryName.CodeCoverage],
      labelQuery: QueryName.BugsOpen,
    };
  },
  computed: {
    busy() {
      return this.operationState === OperationState.Busy;
    },
    queryTypes() {
      const allQueries = [...this.inputQueries];
      if (this.labelQuery) {
        allQueries.push(this.labelQuery);
      }
      return uniq(allQueries);
    },
  },
};
</script>
