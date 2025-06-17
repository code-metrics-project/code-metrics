import { verbose } from "../../utils/logger/logger";
import { getWorkloadById } from "../../config/configMapping";
import { RepoCodeAnalysisKey } from "../../utils/repos";
import { ComponentCoverage } from "../../model/codeAnalysis";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import {CodeAnalysisTypes} from "../../model/config/common";

const builders: Record<string, () => CodeAnalysisService> = {};
const instances: Record<string, CodeAnalysisService> = {};

export const registerCodeAnalysis = (type: CodeAnalysisTypes, builder: () => CodeAnalysisService) => {
  verbose(`Registered code analysis implementation for: ${type}`);
  builders[type] = builder;
};

export const getCodeAnalysisForWorkload = (workload: Workload): CodeAnalysisService =>
  getCodeAnalysis(workload.codeAnalysis.type);

export const getCodeAnalysisForWorkloadId = (workloadId: WorkloadId): CodeAnalysisService => {
  const workload = getWorkloadById(workloadId);
  return getCodeAnalysisForWorkload(workload);
};

const getCodeAnalysis = (type: string): CodeAnalysisService => {
  let instance = instances[type];
  if (!instance) {
    const builder = builders[type];
    if (!builder) {
      throw new Error(`No code analysis implementation registered for type: ${type}`);
    }
    instance = builder();
    instances[type] = instance;
  }
  return instance;
};

export type MetricHistoryRecord = {
  date: string;
} & Record<string, any>;

export type CsvMetricResponse = {
  tag: string;
} & MetricHistoryRecord;

export type JsonMetricResponse = {
  workloadId: WorkloadId;
  repoGroup: string;
  raw: MetricHistoryRecord[];
};

export type MetricResponse = {
  component: { measures: { value: string }[] };
  errors?: any[];
};

export type CodeAnalysisService = {
  fetchMetricHistoryAsJson(
    repoGroups: string[],
    workload: Workload,
    metrics: string[],
    startDate: string,
  ): Promise<JsonMetricResponse[]>;

  fetchMetricHistoryAsCsv(
    repoGroups: string[],
    workload: Workload,
    metrics: string[],
    startDate: string,
  ): Promise<CsvMetricResponse[]>;

  fetchProjectCoverage(
    workloadId: WorkloadId,
    codeAnalysisKey: RepoCodeAnalysisKey,
    requestedSnapshotTimestamp?: number,
  ): Promise<ComponentCoverage>;

  fetchRepoGroupCoverage(
    workloadId: WorkloadId,
    repoGroup: string,
    requestedSnapshotTimestamp?: number,
  ): Promise<ComponentCoverage[]>;

  getMetric(workloadId: WorkloadId, metrics: string, projectKey: string, path: string): Promise<MetricResponse>;

  getMetricLink(workloadId: WorkloadId, metricName: string, projectKey: string, path: string): string;

  getProjectKeysForRepoGroups(repoGroups: string[], workloadId: WorkloadId): Promise<string[]>;
};
