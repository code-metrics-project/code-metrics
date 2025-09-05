import { describe, expect, it } from "vitest";
import { createMultiChartDatasets } from "@/chart/multichart";
import type { DatedMetrics, MetricEntry } from "@/model/metrics";

describe("createMultiChartDatasets", () => {
  it("creates datasets with correct data and formatters", () => {
    const dataset = new Map<string, DatedMetrics>();

    const entries = new Map<string, MetricEntry>();
    entries.set("tag1", { date: "2022-08-01T10:00:00Z", value: 3 });
    entries.set("tag2", { date: "2022-08-01T10:00:00Z", value: 7 });
    dataset.set("2022-08-01", { entries });

    const chartData = createMultiChartDatasets([dataset]);

    expect(chartData.datasets.length).toBe(2);
    expect(chartData.formatters?.length).toBe(2);
  });

  it("handles empty input", () => {
    const chartData = createMultiChartDatasets([]);
    expect(chartData.datasets.length).toBe(0);
    expect(chartData.formatters?.length).toBe(0);
  });
});
