export type ChartType = "line" | "bar" | "area" | "pie" | "donut" | "scatter";

export interface ChartDataPoint {
  x: number | string;
  y: number;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}
