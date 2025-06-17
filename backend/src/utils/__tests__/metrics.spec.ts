import {
  convertMetricsMapToObj,
  getMetricsMetadata,
  interpolateMissing,
  MissingBehaviour,
} from "../metrics";
import { toDatedMetricsMap, toIntermediateMap } from "../../tests/utils";

describe("metrics", () => {
  it("should extract metadata", () => {
    const values = [];
    for (let i = 0; i < 10; i++) {
      values.push(i);
    }
    const dataset = toDatedMetricsMap("example", values);
    const metadata = getMetricsMetadata(dataset, (entry) => entry.value);
    expect(metadata.earliestDate).toEqual(new Date("2022-01-01"));
    expect(metadata.latestDate).toEqual(new Date("2022-01-10"));
    expect(metadata.uniqueAxisNames).toEqual(["example"]);
    expect(metadata.min).toBe(0);
    expect(metadata.max).toBe(9);
  });

  it("should interpolate missing days to zero", () => {
    const values = [];
    for (let i = 1; i <= 12; i++) {
      if (i % 5 === 0) {
        // skip this day
        values.push(-1);
      } else {
        values.push(i);
      }
    }
    const dataset = toDatedMetricsMap("example", values);
    expect(dataset.size).toBe(10);

    const output = interpolateMissing(dataset, MissingBehaviour.SET_TO_ZERO, true);
    expect(output.size).toBe(12);

    // check that the missing days are interpolated to zero
    expect(output.get("2022-01-01")?.["example"]?.[0].value).toBe(1);
    expect(output.get("2022-01-05")?.["example"]?.[0].value).toBe(0);
    expect(output.get("2022-01-10")?.["example"]?.[0].value).toBe(0);
    expect(output.get("2022-01-12")?.["example"]?.[0].value).toBe(12);
  });

  it("should interpolate missing days to the last value", () => {
    const values = [];
    for (let i = 1; i <= 12; i++) {
      if (i % 5 === 0) {
        // skip this day
        values.push(-1);
      } else {
        values.push(i);
      }
    }
    const dataset = toDatedMetricsMap("example", values);
    expect(dataset.size).toBe(10);

    const output = interpolateMissing(dataset, MissingBehaviour.USE_LAST_VALUE, true);
    expect(output.size).toBe(12);

    // check that the missing days are interpolated to the last value
    expect(output.get("2022-01-01")?.["example"]?.[0].value).toBe(1);
    expect(output.get("2022-01-05")?.["example"]?.[0].value).toBe(4);
    expect(output.get("2022-01-10")?.["example"]?.[0].value).toBe(9);
    expect(output.get("2022-01-12")?.["example"]?.[0].value).toBe(12);
  });

  it("should convert a metrics map to a record type object", () => {
    const values = [];
    for (let i = 1; i <= 3; i++) {
      values.push(i);
    }
    const dataset = toIntermediateMap("example", values);
    const obj = convertMetricsMapToObj(dataset);
    expect(obj).toEqual({
      "2022-01-01": { example: { date: "2022-01-01", value: 1 } },
      "2022-01-02": { example: { date: "2022-01-02", value: 2 } },
      "2022-01-03": { example: { date: "2022-01-03", value: 3 } },
    });
  });
});
