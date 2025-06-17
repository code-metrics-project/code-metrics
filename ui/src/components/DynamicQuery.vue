<template>
  <v-card>
    <slot name="header" />
    <div v-if="!$slots.header">
      <v-card-title>{{ title }}</v-card-title>
      <v-card-subtitle>{{ subtitle }}</v-card-subtitle>
    </div>

    <v-card-text>
      <DynamicInputs
        @input="onInput"
        @execute="onExecute"
        @update-query="onUpdateQuery"
        :operationState="operationState"
        :query-name="title"
        :query-types="queryTypes"
        :default-inputs="defaultInputs"
        :execute-on-mount="executeOnMount"
      >
        <template v-slot:buttons v-if="!!$slots.buttons">
          <slot name="buttons" />
        </template>
        <template v-slot:menuItems v-if="!!$slots.menuItems">
          <slot name="menuItems" />
        </template>
        <template v-slot:inputs>
          <QueryGroup
            v-if="queryTypes?.length"
            :operationState="operationState"
            :dimensions="supportedDimensions"
            v-model="groupBy"
          />
        </template>
      </DynamicInputs>
    </v-card-text>

    <CodeAnalysisMetricSummary
      v-if="chartData"
      :summarise="summarise"
      :metrics="allDatasets"
    />
    <DynamicChart
      v-if="chartData"
      :chart-data="chartData"
      :chart-type="chartType"
      :show-data-labels="showDataLabels"
    />
  </v-card>
</template>

<script lang="ts" setup>
// @ts-nocheck
import DynamicInputs from "@/components/DynamicInputs.vue";
import CodeAnalysisMetricSummary from "@/components/CodeAnalysisMetricSummary.vue";
import DynamicChart from "@/components/charts/DynamicChart.vue";
import type { StoredQueryCollection } from "@/model/query";
import { computed } from "vue";
import type { QueryName } from "@/queries/queries";
import QueryGroup from "@/components/query/QueryGroup.vue";
import { getGroupBy } from "@/queries/config";
import { useQueryManager } from "@/composables/query-manager";
import { ChartType } from "@/chart/chart-types";

type TProps = {
  defaultInputs?: Record<string, any>;
  title: string;
  subtitle?: string;
  queryTypes: QueryName[];
  summarise?: string[];
  executeOnMount?: boolean;
  chartType?: ChartType;
  showDataLabels?: boolean;
};

const props = withDefaults(defineProps<TProps>(), {
  chartType: ChartType.MultiChart,
});
const emit = defineEmits(["input", "updateQuery"]);

const supportedDimensions = computed<string[]>(() =>
  getGroupBy(props.queryTypes),
);

function onInput(inputs: any) {
  // bubble-up input event
  emit("input", inputs);
}

const { onExecute, groupBy, operationState, allDatasets, chartData } =
  useQueryManager(props.title);

function onUpdateQuery(queries: StoredQueryCollection) {
  // bubble-up updateQuery event
  emit("updateQuery", queries);
}
</script>
