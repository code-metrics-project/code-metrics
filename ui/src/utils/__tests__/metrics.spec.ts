import { describe, expect, it } from "vitest";
import { sumAllMetricValues } from "../metrics";
import type { DatedMetrics, MetricEntry } from "@/model/metrics";

describe("metric summariser", () => {
  it("sums all metric values", () => {
    const input = new Map<string, DatedMetrics>();

    const entries1 = new Map<string, MetricEntry>();
    entries1.set("athena", { date: "2023-12-11", value: 1 });
    input.set("2023-12-11", { entries: entries1 });

    const entries2 = new Map<string, MetricEntry>();
    entries2.set("athena", { date: "2023-12-12", value: 2 });
    input.set("2023-12-12", { entries: entries2 });

    const result = sumAllMetricValues(input);
    expect(result).toBe(3);
  });

  it("handles an empty metrics map", () => {
    const input = new Map<string, DatedMetrics>();
    const result = sumAllMetricValues(input);
    expect(result).toBe(0);
  });
});
