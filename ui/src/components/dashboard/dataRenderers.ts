import { type Component } from "vue";
import BoxPlot from "./dataRenderers/BoxPlot.vue";
import Chart from "./dataRenderers/Chart.vue";
import Trend from "./dataRenderers/Trend.vue";
import ColChart from "@/components/dashboard/dataRenderers/ColChart.vue";

export const dataRenderers = {
  BoxPlot,
  Chart,
  ColChart,
  Trend,
} satisfies Record<string, Component>;

export type TDataRendererType = {
  [K in keyof typeof dataRenderers]: {
    name: K;
    props: Omit<InstanceType<(typeof dataRenderers)[K]>["$props"], "data">;
  };
}[keyof typeof dataRenderers];
