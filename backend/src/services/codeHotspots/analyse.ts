import uniq from "lodash/uniq";
import { CompletePrInfo, PathData } from "../../model/vcs";
import { getCodeAnalysisForWorkloadId } from "../codeAnalysis/codeAnalysisService";
import { getCodeAnalysisKeysForComponent } from "../../utils/repos";
import { SoftwareComponent, WorkloadId } from "../../model/config/workload-config";
import { getIssueMgmtForWorkload } from "../projectManangement/issueMgmtService";
import { getWorkloadById } from "../../config/configMapping";

const getAllPaths = ({ filesChanged }: CompletePrInfo) => filesChanged.map((change) => change.path);

const getCoverageForPaths = async (
  workloadId: WorkloadId,
  paths: string[],
  codeAnalysisKey: string,
): Promise<Map<string, string | undefined>> => {
  const analysisService = getCodeAnalysisForWorkloadId(workloadId);
  const pathCoverageMap = new Map<string, string | undefined>();

  for (const path of paths) {
    const metric = await analysisService.getMetric(
      workloadId,
      "coverage",
      codeAnalysisKey,
      path.startsWith("/") ? path.substr(1) : path,
    );
    const metricValue = metric?.component?.measures[0]?.value || undefined;
    pathCoverageMap.set(path, metricValue);
  }

  return pathCoverageMap;
};

const getTicketsForPaths = (prs: CompletePrInfo[]): Map<string, string[]> => {
  const ticketMap = new Map<string, string[]>();
  for (const pr of prs) {
    for (const { path } of pr.filesChanged) {
      let tickets = ticketMap.get(path);
      if (!tickets) {
        tickets = [];
      }
      tickets.push(pr.issueId);
      ticketMap.set(path, tickets);
    }
  }
  return ticketMap;
};

export const findCodeHotspotsForPRs = async (
  workloadId: WorkloadId,
  prs: CompletePrInfo[],
  component: SoftwareComponent,
  limit?: number,
): Promise<PathData[]> => {
  let paths: string[];
  if (component.paths?.length) {
    paths = component.paths;
  } else {
    paths = prs.map(getAllPaths).flat();
  }
  paths = uniq(paths);

  let allPathsWithFrequency: PathData[] = [];
  const codeAnalysisKeys = getCodeAnalysisKeysForComponent(workloadId, component);

  // Get issue management service to build ticket links
  const workload = getWorkloadById(workloadId);
  const issueMgmt = getIssueMgmtForWorkload(workload);

  for (const codeAnalysisKey of codeAnalysisKeys) {
    const coverageMap = await getCoverageForPaths(workloadId, paths, codeAnalysisKey);
    const ticketMap = getTicketsForPaths(prs);

    const pathsWithFrequency = paths
      .reduce((acc: PathData[], path) => {
        // Ignore folder paths
        if (!path || !path.includes(".")) return acc;

        const coverage = coverageMap.get(path) ? `${coverageMap.get(path)}%` : `-`;
        const issueIds = ticketMap.get(path) || [];
        const currentPathInArray = acc.find((value) => value.path === path);
        if (!currentPathInArray) {
          acc.push({
            path,
            count: issueIds.length, // Count how many issue-related PRs touched this file
            coverage,
            issueIds,
            issueLinks: [], // Will be populated after deduplication
          });
        } else {
          currentPathInArray.count = currentPathInArray.count + issueIds.length;
          currentPathInArray.issueIds.push(...issueIds);
        }
        return acc;
      }, [])
      .sort((a, b) => b.count - a.count);

    allPathsWithFrequency.push(...pathsWithFrequency);
  }

  if (limit) {
    allPathsWithFrequency = allPathsWithFrequency.slice(0, limit);
  }

  // dedupe tickets and build issue links
  for (const item of allPathsWithFrequency) {
    item.issueIds = uniq(item.issueIds);
    item.issueLinks = item.issueIds.map((id) => ({
      id,
      url: issueMgmt.buildTicketLink(workloadId, id),
    }));
  }

  return allPathsWithFrequency;
};
