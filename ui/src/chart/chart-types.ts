import type { ApexOptions } from "apexcharts";

export type ChartTypes = NonNullable<NonNullable<ApexOptions["chart"]>["type"]>;

export enum ChartType {
  ColumnChart = "ColumnChart",
  DoughnutChart = "DoughnutChart",
  MultiChart = "MultiChart",
  DataTable = "DataTable",
}

export type ChartTypeMetadata = {
  chartType: ChartType;
  name: string;
  icon: string;
};

const chartTypes: ChartTypeMetadata[] = [
  {
    chartType: ChartType.MultiChart,
    name: "Line chart",
    icon: "mdi-chart-line",
  },
  {
    chartType: ChartType.ColumnChart,
    name: "Column chart",
    icon: "mdi-chart-bar",
  },
  {
    chartType: ChartType.DoughnutChart,
    name: "Doughnut chart",
    icon: "mdi-chart-donut",
  },
  {
    chartType: ChartType.DataTable,
    name: "Table",
    icon: "mdi-table",
  },
];

export const listChartTypes = (): ChartTypeMetadata[] => chartTypes;
