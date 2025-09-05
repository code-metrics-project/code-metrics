<template>
  <apexchart width="100%" type="donut" :options="options" :series="chartData.data" />
</template>

<script lang="ts" setup>
import type { ApexOptions } from "apexcharts";
import { computed } from "vue";
import { useTheme } from "vuetify";
import { getThemeString } from "@/plugins/vuetify";
import type { DoughnutChartData } from "@/chart/doughnut";

type Props = {
  chartData: DoughnutChartData;
  chartOptions?: ApexOptions;
};

const props = defineProps<Props>();
const theme = useTheme();

const options = computed(() => {
  const opts: ApexOptions = {
    labels: props.chartData.labels,
    colors: props.chartData.colors,
    legend: {
      position: "top",
    },
    plotOptions: {
      pie: {
        donut: {
          size: "50%",
        },
      },
    },
    theme: {
      mode: getThemeString(theme),
    },
    ...props.chartOptions,
  };
  return opts;
});
</script>
