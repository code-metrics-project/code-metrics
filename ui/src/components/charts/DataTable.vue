<template>
  <v-container>
    <v-row>
      <v-col sm="6">
        <v-card-title>Results</v-card-title>
      </v-col>
      <v-col sm="6" class="d-flex">
        <v-spacer />
        <export-csv-button :chart-data="props.chartData" density="compact" />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-data-table
          :headers="headers"
          :items="allItems"
          :sort-by="[{ key: 'date' }]"
          :items-per-page="50"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import type { ApexOptions } from "apexcharts";
import { computed } from "vue";
import ExportCsvButton from "@/components/ExportCsvButton.vue";
import { convertColumnChartDatasetToTable } from "@/utils/metrics";
import type { ColumnChartData } from "@/chart/column";

type Props = {
  chartData: ColumnChartData;
  chartOptions?: ApexOptions;
};

const props = defineProps<Props>();

const headers = computed(() => {
  return [
    {
      title: "Date",
      key: "date",
    },
    ...props.chartData.series.map((item) => ({
      title: item.name,
      key: item.name,
    })),
  ];
});

const allItems = computed(() =>
  convertColumnChartDatasetToTable(props.chartData),
);
</script>
