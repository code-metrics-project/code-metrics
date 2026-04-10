import type { DatedMetrics } from "@/model/metrics";
import { getBuckets } from "@/utils/rollingAverages";

/**
 * Represents the quartile values for a box plot
 * [min, Q1, median, Q3, max]
 */
export type BoxPlotQuartiles = [number, number, number, number, number];

export interface BoxPlotDataPoint {
  /** The timestamp (end of bucket period) */
  x: number;
  /** Quartile values: [min, Q1, median, Q3, max] */
  y: BoxPlotQuartiles;
  /** Additional metadata for the bucket */
  startDate: number;
  endDate: number;
  count: number;
}

export interface BoxPlotData {
  dataPoints: BoxPlotDataPoint[];
  metricName: string;
}

/**
 * Calculate quartiles from a sorted array of numbers
 */
function calculateQuartiles(sortedValues: number[]): BoxPlotQuartiles {
  if (sortedValues.length === 0) {
    return [0, 0, 0, 0, 0];
  }

  const n = sortedValues.length;
  const min = sortedValues[0];
  const max = sortedValues[n - 1];

  // Q1 (25th percentile)
  const q1Index = Math.floor(n / 4);
  const q1 = sortedValues[q1Index];

  // Median (Q2, 50th percentile)
  const medianIndex = Math.floor(n / 2);
  const median =
    n % 2 === 0 ? (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2 : sortedValues[medianIndex];

  // Q3 (75th percentile)
  const q3Index = Math.floor((n * 3) / 4);
  const q3 = sortedValues[q3Index];

  return [min, q1, median, q3, max];
}

/**
 * Creates box plot chart data from DatedMetrics by bucketing values
 * into time periods (default 60 days) and calculating quartiles.
 *
 * @param data - Map of date strings to DatedMetrics
 * @param bucketSizeInDays - Size of each time bucket in days (default: 60)
 * @returns BoxPlotData with quartiles for each time bucket
 */
export function createBoxPlotData(data: Map<string, DatedMetrics>, bucketSizeInDays = 60): BoxPlotData {
  // Get buckets for aggregation
  const buckets = getBuckets<number>(data, bucketSizeInDays);

  // Get the metric name from the first entry
  let metricName = "";
  for (const [, datedMetrics] of data.entries()) {
    const firstEntry = datedMetrics.entries.keys().next().value;
    if (firstEntry) {
      metricName = firstEntry;
      break;
    }
  }

  // Fill buckets with values from data
  for (const [dateStr, datedMetrics] of data.entries()) {
    const dateTime = new Date(dateStr).getTime();

    for (const bucket of buckets) {
      if (dateTime >= bucket.startDate && dateTime <= bucket.endDate) {
        // Add all metric values to the bucket
        for (const [, entry] of datedMetrics.entries) {
          if (typeof entry.value === "number" && !isNaN(entry.value)) {
            bucket.values.push(entry.value);
          }
        }
        break;
      }
    }
  }

  // Calculate quartiles for each bucket
  const dataPoints: BoxPlotDataPoint[] = buckets
    .filter((bucket) => bucket.values.length > 0)
    .map((bucket) => {
      // Sort values for quartile calculation
      const sortedValues = [...bucket.values].sort((a, b) => a - b);
      const quartiles = calculateQuartiles(sortedValues);

      return {
        x: bucket.endDate,
        y: quartiles,
        startDate: bucket.startDate,
        endDate: bucket.endDate,
        count: sortedValues.length,
      };
    })
    .sort((a, b) => a.x - b.x); // Sort by date ascending

  return {
    dataPoints,
    metricName,
  };
}
