<template>
  <span v-if="converted">
    <ColumnChart
      v-if="chartType === ChartType.ColumnChart"
      :chart-data="converted as ColumnChartData"
      :chart-options="options"
    />
    <DataTable
      v-if="chartType === ChartType.DataTable"
      :chart-data="converted as ColumnChartData"
      :chart-options="options"
    />
    <MultiChart
      v-else-if="chartType === ChartType.MultiChart"
      :chart-data="converted as MultiChartData"
      :chart-options="options"
    />
    <v-row v-else-if="chartType === ChartType.DoughnutChart">
      <v-col
        v-for="(data, index) in (converted as DoughnutChartDataset).dataset"
        :key="index"
        cols="12"
        sm="6"
        lg="4"
        xl="2"
      >
        <DoughnutChart :key="index" :chart-data="data" :chart-options="options" />
      </v-col>
    </v-row>
  </span>
</template>
<script lang="ts" setup>
import { buildAxes, buildDataLabels, mergeAxes } from "@/chart/common";
import MultiChart from "@/components/charts/MultiChart.vue";
import ColumnChart from "@/components/charts/ColumnChart.vue";
import DoughnutChart from "@/components/charts/DoughnutChart.vue";
import { computed } from "vue";
import type { DatedMetrics } from "@/model/metrics";
import type { ApexOptions } from "apexcharts";
import { chooseColour } from "@/utils/colours";
import DataTable from "@/components/charts/DataTable.vue";
import { createMultiChartDatasets, type MultiChartData } from "@/chart/multichart";
import { type ColumnChartData, createColumnChartDatasets } from "@/chart/column";
import { createDoughnutChartDatasets, type DoughnutChartDataset } from "@/chart/doughnut";
import { ChartType } from "@/chart/chart-types";

const props = defineProps<{
  chartData: Map<string, DatedMetrics>[] | null;
  chartOptions?: Record<string, unknown>;
  chartType: ChartType;
  showDataLabels?: boolean;
}>();

const converted = computed(() => {
  if (!props.chartData) {
    return null;
  }
  switch (props.chartType) {
    case ChartType.ColumnChart:
    case ChartType.DataTable:
      return createColumnChartDatasets(props.chartData);
    case ChartType.MultiChart:
      return createMultiChartDatasets(props.chartData);
    case ChartType.DoughnutChart:
      return createDoughnutChartDatasets(props.chartData);
    default:
      console.warn("Unknown chart type", props.chartType);
      return null;
  }
});

const options = computed<ApexOptions>(() => {
  const opts: ApexOptions = props.chartOptions || {};
  const cd = converted.value;
  const formatters = cd?.formatters;

  opts.dataLabels = buildDataLabels(props.showDataLabels, opts.dataLabels, formatters);

  if (!formatters) {
    return opts;
  }
  opts.colors = formatters.map((formatter, idx) => chooseColour(idx, formatter.colourVariant));
  opts.yaxis = mergeAxes(buildAxes(formatters), opts.yaxis ?? []);
  return opts;
});
</script>
