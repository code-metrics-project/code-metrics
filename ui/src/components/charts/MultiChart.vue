<template>
  <apexchart width="100%" height="400" :options="options" :series="chartData.datasets" />
</template>

<script lang="ts" setup>
import { computed } from "vue";
import type { ApexOptions } from "apexcharts";
import type { MultiChartData } from "@/chart/multichart";
import { useTheme } from "vuetify";
import { getThemeString } from "@/plugins/vuetify";

type Props = {
  chartData: MultiChartData;
  chartOptions?: ApexOptions;
};

const props = defineProps<Props>();
const theme = useTheme();

const options = computed(() => {
  const opts: ApexOptions = {
    chart: {
      zoom: {
        enabled: false,
      },
    },
    xaxis: {
      type: "datetime",
    },
    stroke: {
      width: 1,
    },
    theme: {
      mode: getThemeString(theme),
    },
    ...props.chartOptions,
  };
  return opts;
});
</script>
