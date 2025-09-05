import { dateDiffDays, MILLIS_PER_DAY, truncateDateOnly } from "../../utils/date";
import { IntermediaryDatedMetrics, MetricEntry } from "../../model/metrics";

type Model = "simple" | "weighted";

type Bucket = {
  startDate: number;
  endDate: number;
  values: IntermediaryDatedMetrics[];
};

const getBuckets = (data: Map<string, IntermediaryDatedMetrics>, bucketSizeInDays: number, frequencyInDays: number) => {
  const buckets: Bucket[] = [];
  const dates = [...data.keys()].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const dateRange = dateDiffDays(new Date(dates[dates.length - 1]), new Date(dates[0]));
  const bucketSizeInMs = MILLIS_PER_DAY * frequencyInDays;
  const numberOfBuckets = Math.floor(dateRange / bucketSizeInMs) + 1;
  const lastBucketEnd = dates[0];
  for (let i = 0; i < numberOfBuckets; i += frequencyInDays) {
    buckets.push({
      startDate: new Date(lastBucketEnd).getTime() - (i * MILLIS_PER_DAY + MILLIS_PER_DAY * bucketSizeInDays),
      endDate: new Date(lastBucketEnd).getTime() - i * MILLIS_PER_DAY,
      values: [],
    });
  }
  return buckets;
};

const getAllTags = (data: Map<string, IntermediaryDatedMetrics>) => {
  const tags = new Set<string>();
  for (const value of data.values()) {
    for (const [key] of value.entries) {
      tags.add(key);
    }
  }
  return tags;
};

const getRollingAverage = (
  data: Map<string, IntermediaryDatedMetrics>,
  tags: Set<string>,
  spanInDays: number,
  model: Model,
) => {
  const buckets = getBuckets(data, spanInDays, 1);

  const filledBuckets: Bucket[] = buckets.map((bucket) => {
    for (const [key, value] of data.entries()) {
      const dateTime = new Date(key).getTime();
      if (dateTime > bucket.startDate && dateTime <= bucket.endDate) {
        bucket.values.push(value);
      }
    }
    return bucket;
  });

  const bucketMap = new Map<string, IntermediaryDatedMetrics>();
  filledBuckets.forEach((bucket) => {
    /**
     * Subtract a day here from the bucket end date, otherwise the first day of the chart always
     * has the rolling average value as 0 which skews the whole thing.
     */
    const dateString = truncateDateOnly(new Date(bucket.endDate));
    const bucketEntries = new Map<string, MetricEntry>();
    for (const tag of tags) {
      const modelFunc = model === "simple" ? modelSimple : modelWeighted;
      const [result, numberOfEntries] = modelFunc(bucket, tag);
      if (numberOfEntries === 0) continue;

      bucketEntries.set(`${tag}/${spanInDays / 7}-week-average`, {
        date: dateString,
        value: result,
      });
    }
    bucketMap.set(dateString, {
      entries: bucketEntries,
    });
  });
  return bucketMap;
};

const removeOutliersFromData = (data: Map<string, IntermediaryDatedMetrics>): Map<string, IntermediaryDatedMetrics> => {
  const allValues = [];
  for (const value of data.values()) {
    for (const dateValue of value.entries.values()) {
      allValues.push(dateValue.value);
    }
  }
  allValues.sort((a, b) => a - b);
  const q1Point = Math.round((allValues.length + 1) * (1 / 4));
  const q1Value = allValues[q1Point - 1];
  const q3Point = Math.round((allValues.length + 1) * (3 / 4));
  const q3Value = allValues[q3Point - 1];
  const IQR = q3Value - q1Value;
  const lowerFence = q1Value - 1.5 * IQR;
  const upperFence = q3Value + 1.5 * IQR;

  for (const [key, value] of data.entries()) {
    for (const [dateKey, dateValue] of value.entries.entries()) {
      if (dateValue.value >= lowerFence && dateValue.value <= upperFence) {
        value.entries.set(dateKey, dateValue);
      } else {
        value.entries.delete(dateKey);
      }
    }
    if (!value.entries.size) {
      data.delete(key);
    }
  }

  return data;
};

function modelSimple(bucket: Bucket, tag: string) {
  const [result, numberOfEntries] = bucket.values.reduce(
    ([runningAverage, runningNumberOfEntries], val) => {
      if (!val.entries.has(tag)) return [runningAverage, runningNumberOfEntries];
      const newNumberOfEntries = runningNumberOfEntries + 1;
      return [
        (runningAverage * runningNumberOfEntries + val.entries.get(tag)!.value) / newNumberOfEntries,
        newNumberOfEntries,
      ];
    },
    [0, 0],
  );
  return [result, numberOfEntries];
}

function modelWeighted(bucket: Bucket, tag: string) {
  const weightedValues = bucket.values.reduce(
    (acc, val) => {
      if (!val.entries.has(tag)) return acc;
      const metric = val.entries.get(tag)!;
      acc.push({
        weight: new Date(metric.date).getTime() - bucket.startDate,
        value: metric.value,
      });
      return acc;
    },
    [] as { weight: number; value: number }[],
  );
  const total = weightedValues.reduce((acc, value) => acc + value.weight * value.value, 0);
  const denominator = weightedValues.reduce((acc, value) => acc + value.weight, 0);
  const result = total / denominator;
  return [result, weightedValues.length];
}

type TRollingAverageOptions = {
  model?: Model;
  removeOutliers?: boolean;
  spansInDays?: number;
};

export const toRollingAverage = (data: Map<string, IntermediaryDatedMetrics>, options: TRollingAverageOptions = {}) => {
  const { model = "simple", removeOutliers = false, spansInDays = 7 } = options;
  const usableData = removeOutliers ? removeOutliersFromData(data) : data;
  const tags = getAllTags(usableData);
  return getRollingAverage(usableData, tags, spansInDays, model);
};
