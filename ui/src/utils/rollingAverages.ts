import { add } from "date-fns";
import { type DatedMetrics } from "@/model/metrics";
import { dateDiff, truncateDateOnly, MILLIS_PER_DAY } from "@/utils/date";

type Bucket<Content> = {
  startDate: number;
  endDate: number;
  values: Content[];
};

export function getBuckets<Content>(
  data: Map<string, DatedMetrics>,
  bucketSizeInDays: number,
) {
  const buckets: Bucket<Content>[] = [];
  const dates = [...data.keys()].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );
  const dateRange = dateDiff(
    new Date(dates[dates.length - 1]),
    new Date(dates[0]),
  );
  const bucketSizeInMs = MILLIS_PER_DAY * bucketSizeInDays;
  const numberOfBuckets = Math.floor(dateRange / bucketSizeInMs) + 1;
  const lastBucketEnd = dates[0];
  for (let i = 0; i < numberOfBuckets; i++) {
    const endDate = new Date(lastBucketEnd).getTime() - i * bucketSizeInMs;
    buckets.push({
      startDate: endDate - bucketSizeInMs + 1,
      endDate,
      values: [],
    });
  }
  return buckets;
}

function getAllTags(data: Map<string, DatedMetrics>) {
  const tags = new Set<string>();
  for (const [, value] of data.entries()) {
    for (const [key] of value.entries) {
      tags.add(key);
    }
  }
  return tags;
}

function getRollingAverage(
  data: Map<string, DatedMetrics>,
  tags: Set<string>,
  spanInDays: number,
) {
  const buckets = getBuckets<DatedMetrics>(data, spanInDays);

  const filledBuckets: Bucket<DatedMetrics>[] = buckets.map((bucket) => {
    for (const [key, value] of data.entries()) {
      const dateTime = new Date(key).getTime();
      if (dateTime > bucket.startDate && dateTime < bucket.endDate) {
        bucket.values.push(value);
      }
    }
    return bucket;
  });

  const bucketMap = new Map<string, DatedMetrics>();
  filledBuckets.forEach((bucket) => {
    /**
     * Subtract a day here from the bucket end date, otherwise the first day of the chart always
     * has the rolling average value as 0 which skews the whole thing.
     */
    const dateString = truncateDateOnly(
      add(new Date(bucket.endDate).getTime(), { days: -1 }),
    );
    const bucketEntries = new Map();
    for (const tag of tags) {
      const [total, numberOfEntries] = bucket.values.reduce(
        ([runningTotal, runningNumberOfEntries], val) => {
          if (!val.entries.has(tag))
            return [runningTotal, runningNumberOfEntries];
          return [
            runningTotal + val.entries.get(tag)!.value,
            runningNumberOfEntries + 1,
          ];
        },
        [0, 0],
      );
      if (numberOfEntries === 0) continue;

      bucketEntries.set(`${tag}/${spanInDays / 7}-week-average`, [
        {
          date: dateString,
          value: total / numberOfEntries,
        },
      ]);
    }
    bucketMap.set(dateString, {
      entries: bucketEntries,
    });
  });
  return bucketMap;
}

export function getRollingAverages(
  data: Map<string, DatedMetrics>,
  spanInDays: number,
) {
  const tags = getAllTags(data);
  return getRollingAverage(data, tags, spanInDays);
}
