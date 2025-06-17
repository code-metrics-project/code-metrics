import { describe, expect, it } from "vitest";
import { createDoughnutChartData } from "@/chart/doughnut";

describe("createDoughnutChartData", () => {
  it("creates doughnut chart data with correct labels and colors", () => {
    const metrics = new Map<string, number>();
    metrics.set("tag1", 30);
    metrics.set("tag2", 70);

    const chartData = createDoughnutChartData(metrics);

    expect(chartData.labels).toEqual(["tag1", "tag2"]);
    expect(chartData.data).toEqual([30, 70]);
    expect(chartData.colors.length).toBe(2);
  });

  it("handles empty metrics", () => {
    const metrics = new Map<string, number>();
    const chartData = createDoughnutChartData(metrics);
    expect(chartData.labels.length).toBe(0);
    expect(chartData.data.length).toBe(0);
    expect(chartData.colors.length).toBe(0);
  });
});
