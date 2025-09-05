import { describe, expect, it } from "vitest";
import { type MetricEntry } from "@/model/metrics";
import { buildAxes, buildDataLabels, calculatePercentageByTag, type ChartFormat, mergeAxes } from "@/chart/common";
import type { DatedMetrics } from "@/model/metrics";

describe("calculatePercentageByTag", () => {
  it("creates a dataset with correct percentages", () => {
    const dataset = new Map<string, DatedMetrics>();

    const day1entries = new Map<string, MetricEntry>();
    day1entries.set("catalog-successful", {
      date: "2022-08-01T10:00:00Z",
      value: 3,
    });
    day1entries.set("catalog-failed", {
      date: "2022-08-01T10:00:00Z",
      value: 7,
    });
    dataset.set("2022-08-01", { entries: day1entries });

    const day2entries = new Map<string, MetricEntry>();
    day2entries.set("catalog-successful", {
      date: "2022-08-02T10:00:00Z",
      value: 3,
    });
    day2entries.set("catalog-failed", {
      date: "2022-08-02T10:00:00Z",
      value: 7,
    });
    dataset.set("2022-08-02", { entries: day2entries });

    const percentages = calculatePercentageByTag(dataset);

    // each tag should be represented by a single entry
    expect(percentages.size).toBe(2);

    expect(percentages.get("catalog-successful")).toEqual(30);
    expect(percentages.get("catalog-failed")).toEqual(70);
  });

  it("returns correct percentages for multiple tags", () => {
    const dataset = new Map<string, DatedMetrics>();

    const entries = new Map<string, MetricEntry>();
    entries.set("tag1", { date: "2022-08-01T10:00:00Z", value: 3 });
    entries.set("tag2", { date: "2022-08-01T10:00:00Z", value: 7 });
    dataset.set("2022-08-01", { entries });

    const percentages = calculatePercentageByTag(dataset);

    expect(percentages.get("tag1")).toEqual(30);
    expect(percentages.get("tag2")).toEqual(70);
  });

  it("handles empty dataset", () => {
    const dataset = new Map<string, DatedMetrics>();
    const percentages = calculatePercentageByTag(dataset);
    expect(percentages.size).toBe(0);
  });

  it("handles dataset with zero values", () => {
    const dataset = new Map<string, DatedMetrics>();

    const entries = new Map<string, MetricEntry>();
    entries.set("tag1", { date: "2022-08-01T10:00:00Z", value: 0 });
    entries.set("tag2", { date: "2022-08-01T10:00:00Z", value: 0 });
    dataset.set("2022-08-01", { entries });

    const percentages = calculatePercentageByTag(dataset);

    expect(percentages.get("tag1")).toEqual(0);
    expect(percentages.get("tag2")).toEqual(0);
  });
});

describe("buildAxes", () => {
  it("combines series with the same prefix on the same axis", () => {
    const formatters: ChartFormat[] = [
      { seriesName: "coverage/athena", format: (value) => value.toString() },
      { seriesName: "coverage/gaia", format: (value) => value.toString() },
      { seriesName: "repo-churn/athena", format: (value) => value.toString() },
    ];

    const yaxes = buildAxes(formatters);

    expect(yaxes.length).toBe(2);
    expect(yaxes[0].seriesName).toEqual(["coverage/athena", "coverage/gaia"]);
    expect(yaxes[1].seriesName).toEqual(["repo-churn/athena"]);
  });

  it("handles empty formatters array", () => {
    const formatters: ChartFormat[] = [];

    const yaxes = buildAxes(formatters);

    expect(yaxes.length).toBe(0);
  });

  it("sets min and max values correctly", () => {
    const formatters: ChartFormat[] = [
      {
        seriesName: "coverage/athena",
        format: (value) => value.toString(),
        min: 0,
        max: 100,
      },
      {
        seriesName: "coverage/gaia",
        format: (value) => value.toString(),
        min: 10,
        max: 90,
      },
    ];

    const yaxes = buildAxes(formatters);

    expect(yaxes[0].min).toBe(0);
    expect(yaxes[0].max).toBe(100);
  });

  it("handles formatters without min and max values", () => {
    const formatters: ChartFormat[] = [
      { seriesName: "coverage/athena", format: (value) => value.toString() },
      { seriesName: "coverage/gaia", format: (value) => value.toString() },
    ];

    const yaxes = buildAxes(formatters);

    expect(yaxes[0].min).toBeUndefined();
    expect(yaxes[0].max).toBeUndefined();
  });

  it("alternates the opposite property for each axis", () => {
    const formatters: ChartFormat[] = [
      { seriesName: "coverage/athena", format: (value) => value.toString() },
      { seriesName: "repo-churn/athena", format: (value) => value.toString() },
      { seriesName: "coverage/gaia", format: (value) => value.toString() },
    ];

    const yaxes = buildAxes(formatters);

    expect(yaxes[0].opposite).toBe(false);
    expect(yaxes[1].opposite).toBe(true);
  });
});

describe("mergeAxes", () => {
  it("merges two arrays of axes correctly", () => {
    const a = [{ title: { text: "Axis A1" } }, { title: { text: "Axis A2" } }];
    const b = [{ title: { text: "Axis B1" } }, { title: { text: "Axis B2" } }];
    const result = mergeAxes(a, b);
    expect(result).toEqual([{ title: { text: "Axis B1" } }, { title: { text: "Axis B2" } }]);
  });

  it("merges an array and a single axis correctly", () => {
    const a = [{ title: { text: "Axis A1" } }];
    const b = { title: { text: "Axis B1" } };
    const result = mergeAxes(a, b);
    expect(result).toEqual([{ title: { text: "Axis B1" } }]);
  });

  it("merges two single axes correctly", () => {
    const a = { title: { text: "Axis A1" } };
    const b = { title: { text: "Axis B1" } };
    const result = mergeAxes(a, b);
    expect(result).toEqual([{ title: { text: "Axis B1" } }]);
  });

  it("handles empty arrays correctly", () => {
    const a: ApexYAxis[] = [];
    const b: ApexYAxis[] = [];
    const result = mergeAxes(a, b);
    expect(result).toEqual([]);
  });

  it("handles one empty array correctly", () => {
    const a: ApexYAxis[] = [];
    const b = [{ title: { text: "Axis B1" } }];
    const result = mergeAxes(a, b);
    expect(result).toEqual([{ title: { text: "Axis B1" } }]);
  });

  it("handles different lengths of arrays correctly", () => {
    const a = [{ title: { text: "Axis A1" } }];
    const b = [{ title: { text: "Axis B1" } }, { title: { text: "Axis B2" } }];
    const result = mergeAxes(a, b);
    expect(result).toEqual([{ title: { text: "Axis B1" } }, { title: { text: "Axis B2" } }]);
  });
});

describe("buildDataLabels", () => {
  it("enables data labels when showDataLabels is true", () => {
    const result = buildDataLabels(true, undefined, undefined);
    expect(result.enabled).toBe(true);
  });

  it("disables data labels when showDataLabels is false", () => {
    const result = buildDataLabels(false, undefined, undefined);
    expect(result.enabled).toBe(false);
  });

  it("uses default formatter when no formatters are provided", () => {
    const result = buildDataLabels(true, undefined, undefined);
    expect(result.formatter).toBeUndefined();
  });

  it("uses provided formatter for the correct series index", () => {
    const formatters: ChartFormat[] = [{ seriesName: "series1", format: (value) => `formatted ${value}` }];
    const result = buildDataLabels(true, undefined, formatters);
    const formattedValue = result.formatter?.(123, { seriesIndex: 0 });
    expect(formattedValue).toBe("formatted 123");
  });

  it("handles undefined dataLabels parameter", () => {
    const result = buildDataLabels(true, undefined, undefined);
    expect(result).toBeDefined();
  });

  it("preserves existing dataLabels properties", () => {
    const existingDataLabels = { enabled: false, style: { fontSize: "12px" } };
    const result = buildDataLabels(true, existingDataLabels, undefined);
    expect(result.style?.fontSize).toBe("12px");
  });
});
