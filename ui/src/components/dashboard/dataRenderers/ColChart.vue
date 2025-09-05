<template>
  <DynamicChart v-if="data" :chart-type="ChartType.ColumnChart" :chart-data="[data]" :chart-options="options" />
</template>

<script lang="ts" setup>
import { type DatedMetrics } from "@/model/metrics";
import DynamicChart from "@/components/charts/DynamicChart.vue";
import { ChartType } from "@/chart/chart-types";

defineProps<{
  data: Map<string, DatedMetrics>;
  options?: Record<string, unknown>;
}>();
</script>
