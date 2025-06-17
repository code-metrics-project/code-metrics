import { MetricItemDimensions } from "./metrics";

export enum QueryComponentType {
  DynamicInput = "dynamic-input",
  FileCoverageBreakdown = "file-metric-breakdown",
  CodeAnalysisMetricSummary = "code-analysis-metric-summary",
}

export type StoredQuery = {
  name: string;
  description?: string;
  component: QueryComponentType;
  props?: Record<string, any>;
  render?: {
    chartType?: string;
  };
};

export type StoredQueryCollectionMeta = {
  id: string;
  title: string;
};

export type StoredQueryCollection = StoredQueryCollectionMeta & {
  queries: StoredQuery[];
};

/**
 * Name of the metric dimension on which to group.
 */
export type GroupBy = keyof MetricItemDimensions;

export type Args = Record<string, any>;

export enum TransformTypes {
  RollingAverages = "rolling-averages",
}

export type RawQuery = {
  queryName: string;
  args: Args;
  groupBy?: GroupBy;
  transforms?: { transform: TransformTypes; args: Args }[];
};
