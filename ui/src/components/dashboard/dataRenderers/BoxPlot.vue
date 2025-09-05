<template>
  <MultiChart v-if="Object.keys(chartData).length" :chart-data="chartData" />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import MultiChart from "@/components/charts/MultiChart.vue";
import { type DatedMetrics } from "@/model/metrics";

import { createBoxPlotChartData } from "@/chart/boxplot";

type Props = {
  data: Map<string, DatedMetrics>;
};

const props = defineProps<Props>();

const chartData = computed(() => {
  return createBoxPlotChartData(props.data);
});
</script>
