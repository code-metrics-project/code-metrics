import { IntermediaryDatedMetrics } from "../../../model/metrics";
import asciichart from "asciichart";

export function plotChart(prediction: Map<string, IntermediaryDatedMetrics>, additionalSeries: number[] = []) {
  const chart = [];
  prediction.forEach((metrics) => {
    const predictedValue = metrics.entries.get("prediction").value;
    chart.push(predictedValue);
  });
  console.log(chart);

  const allSeries = [chart];
  if (additionalSeries.length > 0) {
    allSeries.push(additionalSeries);
  }
  console.log("Plotting", allSeries);
  console.log(asciichart.plot(allSeries));
}
