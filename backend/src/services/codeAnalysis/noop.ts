/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentCoverage } from "../../model/codeAnalysis";
import { CodeAnalysisTypes } from "../../model/config/common";
import { RepoCodeAnalysisKey } from "../../utils/repos";
import {
  CodeAnalysisService,
  CsvMetricResponse,
  JsonMetricResponse,
  MetricResponse,
  registerCodeAnalysis,
} from "./codeAnalysisService";
import { Workload } from "../../model/config/workload-config";

export const initNoOpCodeAnalysis = () =>
  registerCodeAnalysis(CodeAnalysisTypes.NONE, () => new NoOpCodeAnalysisService());

/**
 * A 'no-op' implementation of `CodeAnalysisService` that returns empty/safe
 * results when no code analysis service is configured.
 */
class NoOpCodeAnalysisService implements CodeAnalysisService {
  async fetchMetricHistoryAsJson(
    repoGroups: string[],
    workload: Workload,
    metrics: string[],
    startDate: string,
  ): Promise<JsonMetricResponse[]> {
    return [];
  }

  async fetchMetricHistoryAsCsv(
    repoGroups: string[],
    workload: Workload,
    metrics: string[],
    startDate: string,
  ): Promise<CsvMetricResponse[]> {
    return [];
  }

  async fetchProjectCoverage(
    workloadId: string,
    codeAnalysisKey: RepoCodeAnalysisKey,
    requestedSnapshotTimestamp?: number,
  ): Promise<ComponentCoverage> {
    return <ComponentCoverage>{
      analysisKey: codeAnalysisKey,
      analysisLink: "#",
      component: codeAnalysisKey.repoName ?? codeAnalysisKey.key,
      coverage: 0,
      totalLines: 0,
      totalLinesToCover: 0,
    };
  }

  async fetchRepoGroupCoverage(
    workloadId: string,
    repoGroup: string,
    requestedSnapshotTimestamp?: number,
  ): Promise<ComponentCoverage[]> {
    return [];
  }

  async getMetric(workloadId: string, metrics: string, projectName: string, path: string): Promise<MetricResponse> {
    return <MetricResponse>{ component: { measures: [] } };
  }

  getMetricLink(workloadId: string, metricName: string, projectKey: string, path: string): string {
    return "#";
  }

  async getProjectKeysForRepoGroups(repoGroups: string[], workloadId: string): Promise<string[]> {
    return [];
  }
}
