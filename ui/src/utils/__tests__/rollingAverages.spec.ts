import { describe, expect, it } from "vitest";
import { getBuckets } from "../rollingAverages";
import type { DatedMetrics, MetricEntry } from "../../model/metrics";

describe("getBuckets", () => {
  it("Should return the right number / size of buckets for the bucket size requested", () => {
    const dataEntries = new Map<string, MetricEntry>();
    dataEntries.set("catalog", { date: "2022-08-02T10:00:00Z", value: 1 });
    const dataEntries2 = new Map<string, MetricEntry>();
    dataEntries2.set("catalog", { date: "2022-03-02T10:00:00Z", value: 1 });
    const data = new Map<string, DatedMetrics>();
    data.set("2022-08-02", { entries: dataEntries });
    data.set("2022-03-02", { entries: dataEntries2 });

    const buckets = getBuckets(data, 14);
    expect(buckets.length).toBe(11);
    expect(buckets[0].endDate - buckets[0].startDate).toBe(1209599999);

    const buckets2 = getBuckets(data, 31);
    expect(buckets2.length).toBe(5);
    expect(buckets2[0].endDate - buckets2[0].startDate).toBe(2678399999);
  });
});
