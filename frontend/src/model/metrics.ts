export interface DatedMetricEntry<T> {
  date: string;
  value: T;
}

export type MetricEntry = DatedMetricEntry<number>;

export interface DatedMetrics {
  entries: Map<string, MetricEntry>;
}

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
