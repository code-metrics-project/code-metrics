import { verbose, logger } from "../../utils/logger/logger";
import { getAllCodeAnalysisConfig, getWorkloadById } from "../../config/configMapping";
import { RepoCodeAnalysisKey } from "../../utils/repos";
import { ComponentCoverage } from "../../model/codeAnalysis";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { CodeAnalysisTypes } from "../../model/config/common";
import { ConnectionChecker, ConnectionCheckResult } from "../../model/remote-connection-status";

const builders: Record<string, () => CodeAnalysisService> = {};
const instances: Record<string, CodeAnalysisService> = {};
const checkers: Record<string, ConnectionChecker> = {};

export const registerCodeAnalysis = (type: CodeAnalysisTypes, builder: () => CodeAnalysisService) => {
  verbose(`Registered code analysis implementation for: ${type}`);
  builders[type] = builder;
};

/**
 * Register a connection checker for a Code Analysis provider type.
 * This allows checking connectivity to the remote server.
 */
export const registerCodeAnalysisConnectionChecker = (type: CodeAnalysisTypes, checker: ConnectionChecker) => {
  verbose(`Registered code analysis connection checker for: ${type}`);
  checkers[type] = checker;
};

/**
 * Check connectivity to all configured code analysis servers.
 * Returns connection status for each server (excludes 'none' type).
 */
export const checkCodeAnalysisConnections = async (): Promise<ConnectionCheckResult[]> => {
  const config = getAllCodeAnalysisConfig();
  const results: ConnectionCheckResult[] = [];

  // Collect all servers from all code analysis types
  const checks: Promise<ConnectionCheckResult>[] = [];
  for (const [providerType, providerConfig] of Object.entries(config)) {
    if (!providerConfig?.servers) continue;
    if (providerType === CodeAnalysisTypes.NONE) continue; // Skip noop implementations

    const checker = checkers[providerType];
    if (!checker) {
      // No checker registered for this type
      continue;
    }

    for (const server of providerConfig.servers) {
      checks.push(checker(server));
    }
  }

  // Run all checks in parallel
  const settled = await Promise.allSettled(checks);

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      // If a checker itself throws, log the error
      logger(`Code analysis connection check failed with uncaught error: ${result.reason}`);
    }
  }

  return results;
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
