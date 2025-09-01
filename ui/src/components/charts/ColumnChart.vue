<template>
  <apexchart width="100%" height="400" :options="options" :series="chartData.series" />
</template>

<script lang="ts" setup>
import type { ApexOptions } from "apexcharts";
import { computed } from "vue";
import { useTheme } from "vuetify";
import { getThemeString } from "@/plugins/vuetify";
import type { ColumnChartData } from "@/chart/column";

type Props = {
  chartData: ColumnChartData;
  chartOptions?: ApexOptions;
};

const props = defineProps<Props>();
const theme = useTheme();

const options = computed(() => {
  const opts: ApexOptions = {
    chart: {
      height: 350,
      type: "bar",
    },
    plotOptions: {
      bar: {
        borderRadius: 1,
        dataLabels: {
          position: "top",
        },
      },
    },
    xaxis: {
      type: "datetime",
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      crosshairs: {
        fill: {
          type: "gradient",
          gradient: {
            colorFrom: "#D8E3F0",
            colorTo: "#BED1E6",
            stops: [0, 100],
            opacityFrom: 0.4,
            opacityTo: 0.5,
          },
        },
      },
      tooltip: {
        enabled: true,
      },
    },
    yaxis: {
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    theme: {
      mode: getThemeString(theme),
    },
    ...props.chartOptions,
  };
  return opts;
});
</script>
