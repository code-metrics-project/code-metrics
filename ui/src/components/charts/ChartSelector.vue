<template>
  <span class="mr-2">Chart type:</span>
  <v-btn-toggle v-model="chartTypeIndex" color="teal-darken-4">
    <v-btn
      v-for="ct in chartTypes"
      :key="ct.chartType"
      :disabled="busy"
      :active="ct.chartType === chartType"
      class="my-2 bg-grey-lighten-5"
      variant="text"
      @click="() => setChartType(ct.chartType)"
      ><v-icon :icon="ct.icon"></v-icon>
      <v-tooltip activator="parent" location="bottom">{{ ct.name }}</v-tooltip>
    </v-btn>
  </v-btn-toggle>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { OperationState } from "@/utils/ui";
import { ChartType, listChartTypes } from "@/chart/chart-types";

type Props = {
  operationState: OperationState;
  chartType: ChartType;
};

const props = defineProps<Props>();

const busy = computed(() => props.operationState === OperationState.Busy);

const chartTypes = listChartTypes();

const chartTypeIndex = ref(0);

const emit = defineEmits<{
  (e: "input", chartType: ChartType): void;
}>();

function setChartType(ct: ChartType) {
  emit("input", ct);
}
</script>
