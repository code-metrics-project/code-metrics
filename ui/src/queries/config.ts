import { verbose } from "@/utils/logger";
import { uniq } from "lodash";
import { InputType } from "@/queries/inputs";
import { type GroupBy, type QueryAndResult } from "@/model/query";
import { type DatedMetrics } from "@/model/metrics";
import { type ChartValueFormatter } from "@/chart/common";
import { getConfig } from "@/utils/config";

const META_FIRST_STAGE_ID = "_first";

export type ResultsSummaryItem = {
  title: string;
  value: number;
  icon?: string;
  colour?: string;
};

export type ResultsSummary = {
  title: string;
  items: ResultsSummaryItem[];
};

export type QueryChartAxisConfig = {
  /**
   * The Y-axis name for the chart. This should match the prefix of the dated metrics keys.
   * For example, for a series named `coverage/athena`, the axisName would be `coverage`.
   */
  axisName: string;

  /**
   * A hint for the axis colour.
   */
  variant?: "danger" | "warning" | "success" | "neutral";
};

export type QueryChartConfig = {
  /**
   * A query can be associated with multiple axes, e.g. "vulnerabilities" can
   * emit "vulns-high", "vulns-medium", etc.
   */
  axes: QueryChartAxisConfig[];

  /**
   * A function to format the chart values. This is used to format the Y-axis values.
   */
  valueFormatter?: ChartValueFormatter;

  /**
   * Sets the maximum value for the Y-axis.
   */
  yAxisMax?: number;
};

export interface QueryType {
  name: string;
  requires: InputType[];
  groupBy?: GroupBy[];
  summariser?: (results: Map<string, DatedMetrics>) => ResultsSummary;
  chart?: QueryChartConfig;
}

const queryTypes = new Map<string, QueryType>();

export function registerQuery(queryType: QueryType) {
  if (!queryType.groupBy) {
    queryType.groupBy = inferGroupByFromInputs(queryType);
  }
  queryTypes.set(queryType.name, queryType);
}

function inferGroupByFromInputs(queryType: QueryType) {
  const groupBy = queryType.requires
    .map((input) => {
      switch (input) {
        case InputType.WORKLOAD_NAMES:
          return "workloadId";
        case InputType.REPO_GROUPS:
          return "repoGroup";
        case InputType.JOB_GROUPS:
          return "jobGroup";
        default:
          return null;
      }
    })
    .filter((groupBy) => !!groupBy);
  return groupBy as GroupBy[];
}

export function getInputTypes(queryNames: string[]): InputType[] {
  const required: InputType[] = [];
  queryNames.forEach((queryName) => {
    const queryType = queryTypes.get(queryName);
    if (!queryType) {
      throw new Error(`No query registered for: ${queryName}`);
    }
    required.push(...queryType.requires);
  });

  const components = uniq(required);
  if (components.length === 0) {
    verbose(`No inputs registered for: ${queryTypes}`);
  }
  return components;
}

export function getGroupBy(queryNames: string[]): GroupBy[] {
  const groupBy: string[] = [];
  queryNames.forEach((queryName) => {
    const queryType = queryTypes.get(queryName);
    if (!queryType) {
      throw new Error(`No query registered for: ${queryName}`);
    }
    if (queryType.groupBy) {
      groupBy.push(...queryType.groupBy);
    }
  });

  return uniq(groupBy);
}

export function listQueryTypes(): QueryType[] {
  return Array.from(queryTypes.values());
}

export function summariseMetrics(qr: QueryAndResult): ResultsSummary | null {
  const queryType = queryTypes.get(qr.queryName);
  if (!queryType) {
    throw new Error(`No query registered for: ${qr.queryName}`);
  }
  return queryType.summariser ? queryType.summariser(qr.result) : null;
}

export function getChartConfig(axisName: string): QueryChartConfig | undefined {
  const queryType = Array.from(queryTypes.values()).find((qt) => qt.chart?.axes?.find((a) => a.axisName === axisName));
  return queryType?.chart;
}

export function getAllPipelineStages(): string[] {
  return uniq(getConfig().systemConfig.workloads.flatMap((w) => w.pipelineStages));
}

export function getFirstPipelineStage(): string {
  const allStages = getAllPipelineStages();
  return allStages.length > 0 ? allStages[0] : META_FIRST_STAGE_ID;
}
