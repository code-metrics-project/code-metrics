<template>
  <v-btn
    v-bind="props"
    variant="flat"
    :density="props.density"
    @click="exportDataset"
    :disabled="busy"
    aria-label="Export results"
    aria-description="Export the results to a CSV file"
  >
    <slot name="prepend">
      <v-icon
        :icon="busy ? 'mdi-progress-download' : 'mdi-file-export-outline'"
      />
    </slot>
    <slot name="default">Export</slot>
  </v-btn>
</template>

<script setup lang="ts">
import { exportDatasetAsLocalFile } from "@/utils/download";
import { ref } from "vue";
import { convertColumnChartDatasetToTable } from "@/utils/metrics";
import {
  type ColumnChartData,
  createColumnChartDatasets,
} from "@/chart/column";
import { type DatedMetrics } from "@/model/metrics";

/**
 * Either pass in a `datasets` prop or a `chartData` prop.
 */
type TProps = {
  datasets?: Map<string, DatedMetrics>[];
  chartData?: ColumnChartData;
  density?: null | "default" | "comfortable" | "compact";
};

const props = defineProps<TProps>();

const busy = ref(false);

const getTabularData = (): Record<string, string>[] => {
  let chartDatasets: ColumnChartData;
  if (props.chartData) {
    chartDatasets = props.chartData;
  } else if (props.datasets) {
    chartDatasets = createColumnChartDatasets(props.datasets);
  } else {
    return [];
  }
  return convertColumnChartDatasetToTable(chartDatasets);
};

const exportDataset = () => {
  busy.value = true;
  exportDatasetAsLocalFile(getTabularData());
  busy.value = false;
};
</script>
