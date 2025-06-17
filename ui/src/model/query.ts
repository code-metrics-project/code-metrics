import type { DatedMetrics, MetricItemDimensions } from "@/model/metrics";
import type { ChartType } from "@/chart/chart-types.ts";

export enum QueryComponentType {
  DynamicInput = "dynamic-input",
  FileCoverageBreakdown = "file-metric-breakdown",
  CodeAnalysisMetricSummary = "code-analysis-metric-summary",
}

export interface StoredQuery {
  name: string;
  description?: string;
  component: QueryComponentType;
  props?: Record<string, any>;
  render?: {
    chartType?: ChartType;
  };
}

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

export interface RawQuery {
  queryName: string;
  args: Args;
  groupBy?: GroupBy;
  transforms?: { transform: TransformTypes; args: Args }[];
}

export type QueryAndResult = {
  queryName: string;
  result: Map<string, DatedMetrics>;
};
