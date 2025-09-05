import { getWorkloadById, listRepoGroups } from "../config/configMapping";
import uniq from "lodash/uniq";
import { logger, verbose } from "./logger/logger";
import { getVcsForWorkload } from "../services/codeManagement/vcsService";
import { getConfig } from "../config/config";
import { uniqBy } from "lodash";
import { getCodeAnalysisForWorkloadId } from "../services/codeAnalysis/codeAnalysisService";
import { SoftwareComponent, Workload, WorkloadId } from "../model/config/workload-config";

type KeysAndComponents = {
  codeAnalysisKeys: string[];
  components: SoftwareComponent[];
};

type ComponentRegex = SoftwareComponent & {
  pattern: RegExp;
};

export type RepoCodeAnalysisKey = {
  key: string;
  repoName?: string;
};

/**
 * Discover all the software components in scope for a workload query based on the repo groups provided.
 *
 * @param repoGroups
 * @param workloadId
 */
export const getComponentsForWorkloadId = async (repoGroups: string[], workloadId: WorkloadId): Promise<string[]> => {
  const { codeAnalysisKeys, components } = await getKeysAndComponents(workloadId, repoGroups);
  const componentNames: string[] = [];

  // convert code analysis (e.g. Sonar) keys to software component names
  codeAnalysisKeys.forEach((projectKey) => {
    const componentName = getComponentNameForCodeAnalysisKey(workloadId, projectKey);
    componentNames.push(componentName);
  });
  componentNames.push(...components.map((c) => c.name));

  const uniqueComponents = uniq(componentNames);
  logger(`Unique components matched in ${workloadId}:`, uniqueComponents);
  return uniqueComponents;
};

/**
 * Discover all the repositories in scope for a workload query based on the repo groups provided.
 *
 * @param repoGroups
 * @param workloadId
 */
export const getReposForWorkloadId = async (repoGroups: string[], workloadId: WorkloadId): Promise<string[]> => {
  const { codeAnalysisKeys, components } = await getKeysAndComponents(workloadId, repoGroups);
  const repos: string[] = [];

  // convert code analysis (e.g. Sonar) keys to VCS repo names
  codeAnalysisKeys.forEach((projectKey) => {
    const vcsRepoName = getVcsNameForCodeAnalysisKey(workloadId, projectKey);
    repos.push(vcsRepoName);
  });
  repos.push(...components.map((c) => c.repo));

  const uniqueRepos = uniq(repos);
  logger(`Unique repos matched in ${workloadId}:`, uniqueRepos);
  return uniqueRepos;
};

/**
 * Discover all the code analysis (e.g. Sonar) keys in scope for a workload query based on the repo groups provided.
 *
 * @param repoGroups
 * @param workloadId
 */
export const getCodeAnalysisKeysForWorkloadId = async (
  repoGroups: string[],
  workloadId: WorkloadId,
): Promise<RepoCodeAnalysisKey[]> => {
  const { codeAnalysisKeys, components } = await getKeysAndComponents(workloadId, repoGroups);

  const projectKeys: RepoCodeAnalysisKey[] = [];
  projectKeys.push(
    ...codeAnalysisKeys.map((key) => {
      return { key };
    }),
  );

  // convert VCS repo names to code analysis (e.g. Sonar) keys
  components.forEach((component) => {
    const keys = getCodeAnalysisKeysForComponent(workloadId, component);
    projectKeys.push(
      ...keys.map((key) => {
        return { repoName: component.repo, key };
      }),
    );
  });

  const uniqueKeys = uniqBy(projectKeys, "key");
  logger(`Unique code analysis keys matched in ${workloadId}:`, uniqueKeys);
  return uniqueKeys;
};

const getKeysAndComponents = async (workloadId: string, repoGroups: string[]): Promise<KeysAndComponents> => {
  logger(`Fetching keys and repos for ${workloadId} with groups: ${repoGroups}`);
  const workload = getWorkloadById(workloadId);

  // assume no filter implies all
  if (repoGroups.length === 0) {
    repoGroups = listRepoGroups();
  }

  const analysisService = getCodeAnalysisForWorkloadId(workloadId);
  return {
    codeAnalysisKeys: await analysisService.getProjectKeysForRepoGroups(repoGroups, workloadId),
    components: await getComponentsForWorkload(workload, repoGroups),
  };
};

/**
 * Find the repository name patterns (optionally within a given workload) for
 * a given repository group name.
 *
 * @param groupName
 * @param workloadId
 */
export const getComponentPatternsByGroup = (groupName: string, workloadId?: WorkloadId): ComponentRegex[] => {
  return getConfig()
    .workloadConfigs.workloads.filter((w) => {
      return !workloadId || w.id === workloadId;
    })
    .flatMap((w) => {
      const components = w.codeManagement.repoGroups[groupName]?.components;
      return (
        components?.map((component) => {
          // A repoName can either be a plain string, which should match exactly, or a regular expression.
          // If it is in the format "/something/", it is in regular expression format, so the string
          // between the slashes should be extracted.
          const repoName = component.repo;
          const pattern = repoName.match(/\/.+\//) ? repoName.substring(1, repoName.length - 1) : `^${repoName}$`;
          return <ComponentRegex>{
            ...component,
            pattern: new RegExp(pattern),
          };
        }) ?? []
      );
    });
};

function buildComponentFromRepo(cp: ComponentRegex, repo: string) {
  return <SoftwareComponent>{
    name: cp.name ?? repo,
    repo,
    paths: cp.paths,
    exclude: cp.exclude,
  };
}

export const getComponentsForWorkload = async (
  workload: Workload,
  repoGroups: string[],
): Promise<SoftwareComponent[]> => {
  const vcs = getVcsForWorkload(workload);
  const allReposForWorkload = await vcs.getReposForProject(workload.id, workload.codeManagement.projectName);
  const compPatterns = repoGroups.flatMap((rg) => getComponentPatternsByGroup(rg, workload.id));

  const included = compPatterns
    .filter(({ exclude }) => !exclude)
    .flatMap((cp) => {
      const reposForComponent = allReposForWorkload.filter((repo) => repo.match(cp.pattern));
      return reposForComponent.map((repo) => buildComponentFromRepo(cp, repo));
    });
  verbose(`Included ${included.length} components in ${workload.id} for repo groups: ${repoGroups}`, included);

  const excluded = compPatterns
    .filter(({ exclude }) => exclude)
    .flatMap((cp) => {
      const reposForComponent = allReposForWorkload.filter((repo) => repo.match(cp.pattern));
      return reposForComponent.map((repo) => buildComponentFromRepo(cp, repo));
    });
  verbose(`Excluded ${excluded.length} components in ${workload.id} for repo groups: ${repoGroups}`, excluded);

  const filteredComponents = included.filter((c) => {
    return !excluded.find((ec) => ec.repo === c.repo);
  });
  logger(`Matched ${filteredComponents.length} components in ${workload.id} for repo groups: ${repoGroups}`);
  return filteredComponents;
};

/**
 * Return the software component name for the given code analysis (e.g. Sonar) project key.
 * If no explicit mapping is found, the code analysis key is returned.
 * @param workloadId
 * @param codeAnalysisKey
 */
export const getComponentNameForCodeAnalysisKey = (workloadId: WorkloadId, codeAnalysisKey: string): string => {
  const workload = getWorkloadById(workloadId);

  // prefer mappings defined in the workload
  const mapping = workload.codeAnalysis.mappings?.find((map) => map.key === codeAnalysisKey);
  if (mapping) {
    return mapping.componentName;
  }

  return codeAnalysisKey;
};

/**
 * Return the VCS repository name for the given code analysis (e.g. Sonar) project key.
 * If no explicit mapping is found, the code analysis key is returned.
 * @param workloadId
 * @param codeAnalysisKey
 */
export const getVcsNameForCodeAnalysisKey = (workloadId: WorkloadId, codeAnalysisKey: string): string => {
  const workload = getWorkloadById(workloadId);

  // prefer mappings defined in the workload
  const mapping = workload.codeAnalysis.mappings?.find((map) => map.key === codeAnalysisKey);
  if (mapping) {
    return mapping.vcsRepoName;
  }

  return codeAnalysisKey;
};

/**
 * Return all the code analysis keys (e.g. Sonar project/component key) for the given component.
 * If no explicit mappings are found, a 1-sized array containing the component name
 * is returned.
 * @param workloadId
 * @param component
 */
export const getCodeAnalysisKeysForComponent = (workloadId: WorkloadId, component: SoftwareComponent): string[] => {
  const workload = getWorkloadById(workloadId);

  // prefer mappings defined in the workload
  const mappings = workload.codeAnalysis.mappings?.filter(
    (map) => map.componentName === component.name || map.vcsRepoName === component.repo,
  );

  if (mappings?.length) {
    return mappings.map((map) => map.key);
  }

  return [component.name];
};

/**
 * Lookup the repo group for a given repo name within the context of a workload.
 * @param workloadId
 * @param repoName
 */
export const lookupRepoGroupForRepoName = (workloadId: WorkloadId, repoName: string): string | null => {
  const workload = getWorkloadById(workloadId);

  for (const repoGroup of Object.keys(workload.codeManagement.repoGroups)) {
    const compPatterns = getComponentPatternsByGroup(repoGroup, workloadId);
    if (compPatterns.some((cp) => cp.pattern.test(repoName))) {
      return repoGroup;
    }
  }

  return null;
};
