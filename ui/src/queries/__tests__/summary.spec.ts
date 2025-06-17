import { describe, expect, it } from "vitest";
import { summariseNumeric } from "../summary";
import type { DatedMetrics, MetricEntry } from "../../model/metrics";

describe("summariseNumeric", () => {
  it("summarises bugs", () => {
    const dated = new Map<string, DatedMetrics>();
    addMetric(dated, "2023-01-01", "bugs/athena", 50);
    addMetric(dated, "2023-01-02", "bugs/athena", 100);

    const result = summariseNumeric(dated, "Bugs", "mdi-bug");

    expect(result).not.toBeNull();
    expect(result.title).toBe("Bugs");
    expect(result.items).toHaveLength(2);

    const taggedItem = result.items.find((i) => i.title === "athena");
    expect(taggedItem).not.toBeNull();
    expect(taggedItem!.title).toBe("athena");
    expect(taggedItem!.value).toBe(150);
    expect(taggedItem!.icon).toBe("mdi-bug");

    const totalItem = result.items.find((i) => i.title === "total");
    expect(totalItem).not.toBeNull();
    expect(totalItem!.title).toBe("total");
    expect(totalItem!.value).toBe(150);
    expect(totalItem!.icon).toBe("mdi-equal-box");
  });
});

function addMetric(
  dated: Map<string, DatedMetrics>,
  date: string,
  tag: string,
  value: number,
) {
  const entries = new Map<string, MetricEntry>();
  entries.set(tag, { date: date, value: value });
  dated.set(date, { entries });
}
