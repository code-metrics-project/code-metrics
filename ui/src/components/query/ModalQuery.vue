<script setup lang="ts">
import { watch } from "vue";
import { QueryName } from "@/queries/queries";
import { useI18n } from "vue-i18n";
import DynamicChart from "@/components/charts/DynamicChart.vue";
import { useQueryManager } from "@/composables/query-manager";
import type { RawQuery } from "@/model/query";
import ExportCsvButton from "@/components/ExportCsvButton.vue";
import { ChartType } from "@/chart/chart-types";

type TProps = {
  queryName: QueryName;
  inputs: Record<string, unknown>;
  chartType: ChartType;
};

const props = defineProps<TProps>();
const { t } = useI18n();

const title = t(`queries.title.${props.queryName}`);
const subtitle = t(`queries.description.${props.queryName}`);

const { onExecute, chartData } = useQueryManager(title);

const dialog = defineModel<boolean>();

function runQuery() {
  const rawQueries: RawQuery[] = [
    {
      queryName: props.queryName,
      args: props.inputs,
      groupBy: "workloadId",
    },
  ];
  onExecute(rawQueries);
}

watch(dialog, (value) => {
  if (value) {
    runQuery();
  }
});
</script>

<template>
  <div>
    <v-dialog v-model="dialog" max-width="80%" :persistent="false">
      <v-card>
        <v-container fluid class="mx-0 my-0">
          <v-row>
            <v-col>
              <v-card-title>{{ title }}</v-card-title>
              <v-card-subtitle>{{ subtitle }}</v-card-subtitle>
            </v-col>
            <v-col class="d-flex">
              <v-spacer />
              <v-btn icon="mdi-close" @click="() => (dialog = false)" />
            </v-col>
          </v-row>
        </v-container>

        <v-card-item>
          <v-skeleton-loader type="card" v-if="!chartData" height="400" />

          <DynamicChart v-if="chartData" :chart-data="chartData" :chart-type="chartType" :show-data-labels="true" />

          <export-csv-button v-if="chartData" :datasets="chartData" />
        </v-card-item>
      </v-card>
    </v-dialog>
  </div>
</template>
