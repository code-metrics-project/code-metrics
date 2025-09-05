import { addDays } from "date-fns";
import { truncateDateOnly } from "../utils/date";
import { DatedMetrics, DateStamp, IntermediaryDatedMetrics, MetricEntry } from "../model/metrics";

export function toIntermediateMap(label: string, values: number[]): Map<string, IntermediaryDatedMetrics> {
  const startDate = new Date("2022-01-01");
  const valueMap = new Map<string, IntermediaryDatedMetrics>();
  values.forEach((n, i) => {
    if (n === -1) {
      // skip this day
      return;
    }
    const date = truncateDateOnly(addDays(startDate, i));
    const entries = new Map<string, MetricEntry>();
    entries.set(label, { date, value: n });
    valueMap.set(date, { entries });
  });
  return valueMap;
}

export function toDatedMetricsMap(label: string, values: number[]): Map<DateStamp, DatedMetrics> {
  const startDate = new Date("2022-01-01");
  const valueMap = new Map<DateStamp, DatedMetrics>();
  values.forEach((n, i) => {
    if (n === -1) {
      // skip this day
      return;
    }
    const date = addDays(startDate, i);
    const dimensions = { workloadId: "athena" };
    valueMap.set(truncateDateOnly(date), { [label]: [{ dimensions, date, value: n }] });
  });
  return valueMap;
}
