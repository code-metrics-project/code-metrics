import {
  getQualityGatesByWorkloadId,
  getWorkloadById,
  listRepoGroups,
  listWorkloadIds
} from "../../config/configMapping";
import { verbose, warn } from "../../utils/logger/logger";
import { getReposForWorkloadId } from "../../utils/repos";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { Workload } from "../../model/config/workload-config";
import { TQualityGateOutput, TRepoGroupQualityGates, TWorkloadQualityGates } from "../../model/qualityGates";
import { getVariant, getWorstNumeratorAndDenominator } from "./stats";
import { enrichManifest, parseManifest } from "./manifest";

/**
 * Fetch and construct a quality gate object for a given repo in a workload.
 * @param workload
 * @param repoName
 */
const getQualityGate = async (workload: Workload, repo: string): Promise<TQualityGateOutput> => {
  const vcs = getVcsForWorkload(workload);
  const workloadId = workload.id;

  try {
    const rawManifest = await vcs.fetchFile(
      workloadId,
      workload.codeManagement.projectName,
      repo,
      "quality-gate.manifest.json",
    );
    const manifest = parseManifest(rawManifest);
    const repoLink = vcs.buildRepoLink(workloadId, repo);
    if (!manifest) {
      return { repo, repoLink };
    }

    const rules = await vcs.fetchMergeRules(workloadId, workload.codeManagement.projectName, repo);
    const qualityGate = enrichManifest(repo, repoLink, manifest, rules, getQualityGatesByWorkloadId(workloadId));

    verbose(`Fetched quality gate manifest for repo ${repo} in workload ${workloadId}:`, qualityGate);
    return qualityGate;
  } catch (error) {
    verbose(`Failed to fetch quality gate manifest for repo ${repo} in workload ${workloadId}:`, error);
    // Return a basic quality gate object for repos that fail to fetch
    return {
      repo,
      services: undefined,
    };
  }
};

const stripExternalServices = (repoGroup: string, repos: TQualityGateOutput[]) => {
  return repos.map((repo) => {
    return {
      ...repo,
      services:
        repo.services?.length > 1
          ? repo.services.filter((service) => service["service-tag"] === repoGroup)
          : repo.services,
    };
  });
};

const getRepoGroupQualityGates = async (workload: Workload, repoGroup: string): Promise<TRepoGroupQualityGates> => {
  const groupRepoNames = await getReposForWorkloadId([repoGroup], workload.id);

  const repos = await Promise.all(groupRepoNames.map(async (repoName) => getQualityGate(workload, repoName)));

  const reposWithRelevantServices = stripExternalServices(repoGroup, repos);

  const headlineResult = getWorstNumeratorAndDenominator(repoGroup, reposWithRelevantServices);

  const variant = getVariant(headlineResult.numerator, headlineResult.denominator);

  return {
    headline: {
      denominator: headlineResult.denominator,
      missing: headlineResult.missing,
      numerator: headlineResult.numerator,
      variant,
    },
    repos: reposWithRelevantServices,
    repoGroup,
    workloadId: workload.id,
  };
};

const getWorkloadQualityGates = async (
  workloadId: string,
  repoGroups?: string[],
): Promise<TWorkloadQualityGates | undefined> => {
  const workload = getWorkloadById(workloadId);
  if (!workload) {
    warn(`Could not find workload with team ID: ${workload.id}`);
    return;
  }

  const localRepoGroups = repoGroups?.length ? repoGroups : listRepoGroups(workload);

  return {
    workloadId,
    repoGroups: await Promise.all(
      localRepoGroups.map(async (repoGroup) => getRepoGroupQualityGates(workload, repoGroup)),
    ),
  };
};

export const getQualityGates = async (
  requestWorkloadIds?: string[],
  repoGroups?: string[],
): Promise<TWorkloadQualityGates[]> => {
  const workloadIds = requestWorkloadIds?.length ? requestWorkloadIds : listWorkloadIds();

  const qualityGates = await Promise.all(
    workloadIds.map((workloadId) => getWorkloadQualityGates(workloadId, repoGroups)),
  );

  // Filter out undefined results (when workload is not found)
  const validQualityGates = qualityGates.filter((qg): qg is TWorkloadQualityGates => qg !== undefined);

  verbose(`Quality gate report:`, validQualityGates);
  return validQualityGates;
};
