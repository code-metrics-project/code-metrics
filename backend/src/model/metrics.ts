export type DatedMetricEntry<T> = {
  date: string;
  value: T;
};

export type MetricEntry = DatedMetricEntry<number>;

export type MetricItemDimensions = Record<string, string> & {
  /**
   * All metrics have a workloadId.
   */
  workloadId: string;

  /**
   * Not all metrics have a repoGroup.
   */
  repoGroup?: string;

  /**
   * Not all metrics have a repoName.
   */
  repoName?: string;

  /**
   * Not all metrics have a jobGroup.
   */
  jobGroup?: string;

  /**
   * Not all metrics have a jobName.
   */
  jobName?: string;
};

export type MetricItem = {
  /**
   * Dimensions include things like workloadId, repoGroup,
   * and any tags.
   */
  dimensions: MetricItemDimensions;

  /**
   * The date of the metric.
   */
  date: Date;

  /**
   * The value of the metric.
   */
  value: number;
};

/**
 * A day in the format YYYY-MM-DD.
 */
export type DateStamp = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

export type IntermediaryDatedMetrics = {
  entries: Map<string, MetricEntry>;
};

export type MetricsWireFormat = Record<string, Record<DateStamp, MetricEntry>>;

/**
 * Maps an axis name, e.g. 'coverage', to a list of metrics for that axis.
 */
export type DatedMetrics = Record<string, MetricItem[]>;
