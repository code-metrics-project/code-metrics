import { getWorkloadsWithRepoGroup, listRepoGroups } from "../../config/configMapping";
import { verbose, warn } from "../../utils/logger/logger";
import {
  AnalysisLink,
  ComponentCoverage,
  CoverageSummary,
  VariantGroupCoverage,
  WorkloadRepoGroupCoverage,
} from "../../model/codeAnalysis";
import { getCodeAnalysisForWorkloadId } from "./codeAnalysisService";
import { RepoCodeAnalysisKey } from "../../utils/repos";
import { roundTo } from "../../utils/math";
import { WorkloadId } from "../../model/config/workload-config";
import { getEnvConfigItemAsNumber } from "../../config/sources/source";

export type WorkloadRepo = {
  workloadId: string;
  repoName: string;
};

export type RepoGroupHolder = {
  repoGroup: string;
};

export type RepoNameHolder = {
  repoName: string;
};

export type CodeAnalysisIdentifier = RepoGroupHolder | RepoNameHolder;

const coverageDangerThreshold = getEnvConfigItemAsNumber("COVERAGE_THRESHOLD_DANGER", 30);
const coverageWarningThreshold = getEnvConfigItemAsNumber("COVERAGE_THRESHOLD_WARNING", 80);

const processAggregate = async (
  workloads: string[] | undefined,
  repoGroups: string[] | undefined,
  individualRepos: WorkloadRepo[],
  snapshotTime: number,
  aggregate: boolean,
): Promise<WorkloadRepoGroupCoverage[]> => {
  if (!repoGroups || repoGroups.length === 0) {
    repoGroups = listRepoGroups();
  }
  const result: WorkloadRepoGroupCoverage[] = [];
  for (const repoGroup of repoGroups) {
    workloads = workloads ?? getWorkloadsWithRepoGroup(repoGroup).map((w) => w.id);
    for (const workloadId of workloads) {
      const results = await fetchCodeAnalysisData(workloadId, { repoGroup }, snapshotTime, aggregate);
      result.push(...results);
    }
  }
  // Add specific tags
  for (const individual of individualRepos) {
    const results = await fetchCodeAnalysisData(
      individual.workloadId,
      { repoName: individual.repoName },
      snapshotTime,
      aggregate,
    );
    result.push(...results);
  }
  return result;
};

const setVariants = (data: WorkloadRepoGroupCoverage[]): VariantGroupCoverage[] => {
  data.forEach((tag: VariantGroupCoverage) => {
    if (tag.summary?.totalLinesToCover === 0) {
      tag.variant = "no_data";
    } else if (tag.summary?.coverage >= coverageWarningThreshold) {
      tag.variant = "success";
    } else if (tag.summary?.coverage >= coverageDangerThreshold) {
      tag.variant = "warning";
    } else {
      tag.variant = "danger";
    }
  });
  return data as VariantGroupCoverage[];
};

export const getCoverage = async (
  workloads: string[],
  repoGroups: string[],
  individualRepos: WorkloadRepo[],
  snapshotTime: number,
  aggregate: boolean,
): Promise<VariantGroupCoverage[]> =>
  setVariants(await processAggregate(workloads, repoGroups, individualRepos, snapshotTime, aggregate))
    .filter((obj) => {
      if (!obj.summary) {
        warn(`No coverage for: '${obj.name}'`);
        obj.summary = {
          coverage: 0,
          totalLines: 0,
          totalLinesToCover: 0,
        };
      }
      return obj;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

const buildAnalysisLink = (cov: ComponentCoverage): AnalysisLink => ({
  title: cov.analysisKey.key,
  repoName: cov.analysisKey.repoName,
  url: cov.analysisLink,
});

const convertToCoverageResponse = (
  workloadId: WorkloadId,
  componentData: ComponentCoverage[],
): WorkloadRepoGroupCoverage[] =>
  componentData.map((cov) => ({
    name: `${workloadId}/${cov.analysisKey.key}`,
    workloadId,
    numProjects: 1,
    summary: cov,
    analysisLinks: [buildAnalysisLink(cov)],
  }));

const aggregateMetrics = (measures: ComponentCoverage[]): CoverageSummary => {
  const totalLines = measures.reduce((runningTotal, measure) => runningTotal + measure.totalLines, 0);

  const { aggregatedCoverage, totalLinesToCover } = calcWeightedCoverage(measures);

  return {
    coverage: aggregatedCoverage,
    totalLinesToCover,
    totalLines,
  };
};

const calcWeightedCoverage = (
  measures: ComponentCoverage[],
): { aggregatedCoverage: number; totalLinesToCover: number } => {
  const coverageMap = new Map<string, number>(measures.map((obj) => [obj.analysisKey.key, obj.coverage / 100]));
  const linesToCoverMap = new Map<string, number>(measures.map((obj) => [obj.analysisKey.key, obj.totalLinesToCover]));
  let totalLinesToCover = 0;
  let covAmount = 0;

  linesToCoverMap.forEach((lines, key) => {
    covAmount += (coverageMap.get(key) || 0) * lines;
    totalLinesToCover += lines;
  });
  if (totalLinesToCover === 0) {
    return { aggregatedCoverage: 0, totalLinesToCover: 0 };
  } else {
    const aggregatedCoverage = roundTo((covAmount / totalLinesToCover) * 100, 1);
    return { aggregatedCoverage, totalLinesToCover };
  }
};

const aggregateCoverageForRepoGroup = (componentData: ComponentCoverage[], workloadId: string, repoGroup: string) => {
  const projectData = aggregateMetrics(componentData);
  const analysisLinks = componentData.map((cov) => buildAnalysisLink(cov));
  const aggregated: WorkloadRepoGroupCoverage[] = [
    {
      name: `${workloadId}/${repoGroup}`,
      workloadId,
      numProjects: new Set(componentData.map(({ analysisKey }) => analysisKey.key)).size,
      summary: projectData,
      analysisLinks,
    },
  ];
  verbose(`Aggregated metrics for: ${workloadId} by repo group: ${repoGroup}:`, aggregated);
  return aggregated;
};

const fetchCodeAnalysisData = async (
  workloadId: WorkloadId,
  analysisIdentifier: CodeAnalysisIdentifier,
  snapshotTime: number,
  aggregate: boolean,
): Promise<WorkloadRepoGroupCoverage[]> => {
  const analysisService = getCodeAnalysisForWorkloadId(workloadId);

  if ((analysisIdentifier as RepoGroupHolder).repoGroup) {
    const repoGroup = (analysisIdentifier as RepoGroupHolder).repoGroup;
    const componentData = await analysisService.fetchRepoGroupCoverage(workloadId, repoGroup, snapshotTime);

    if (aggregate) {
      return aggregateCoverageForRepoGroup(componentData, workloadId, repoGroup);
    } else {
      return convertToCoverageResponse(workloadId, componentData);
    }
  } else {
    // TODO isn't 'repoName' effectively 'key' here?
    const codeAnalysisKey: RepoCodeAnalysisKey = { key: (analysisIdentifier as RepoNameHolder).repoName };
    const componentData: ComponentCoverage[] = [
      await analysisService.fetchProjectCoverage(workloadId, codeAnalysisKey, snapshotTime),
    ];
    return convertToCoverageResponse(workloadId, componentData);
  }
};

export const testables = {
  convertToCoverageResponse,
  aggregateCoverageForRepoGroup,
};
