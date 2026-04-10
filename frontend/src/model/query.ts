import type { DatedMetrics, MetricItemDimensions } from "@/model/metrics";
import type { ChartType } from "@/components/query/ChartSelector";

export enum QueryComponentType {
  DynamicInput = "dynamic-input",
  FileCoverageBreakdown = "file-metric-breakdown",
  CodeAnalysisMetricSummary = "code-analysis-metric-summary",
}

export interface StoredQuery {
  name: string;
  description?: string;
  component: QueryComponentType;
  props?: Record<string, unknown>;
  render?: {
    chartType?: ChartType;
  };
}

export interface StoredQueryCollectionMeta {
  id: string;
  title: string;
}

export type StoredQueryCollection = StoredQueryCollectionMeta & {
  queries: StoredQuery[];
};

/**
 * Name of the metric dimension on which to group.
 */
export type GroupBy = keyof MetricItemDimensions;

export type Args = Record<string, unknown>;

export enum TransformTypes {
  MLForecast = "ml-forecast",
  RollingAverages = "rolling-averages",
}

export interface RawQuery {
  queryName: string;
  args: Args;
  groupBy?: GroupBy;
  transforms?: { transform: TransformTypes; args: Args }[];
}

export interface QueryAndResult {
  queryName: string;
  result: Map<string, DatedMetrics>;
}
