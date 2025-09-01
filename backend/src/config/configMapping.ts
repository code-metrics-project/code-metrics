import uniq from "lodash/uniq";
import { CodeManagementTypes } from "../model/config/common";
import { getConfig } from "./config";
import { getComponentsForWorkloadId, getReposForWorkloadId } from "../utils/repos";
import { getPipelinesForWorkload } from "../services/pipelines/pipelinesService";
import { listNormalisedJobGroupsForWorkload } from "../utils/jobs";
import {
  CodeAnalysisConfigWrapper,
  CodeManagementConfigWrapper,
  CodeManagementServer,
  PipelinesConfigWrapper,
  RemoteConfigWrapper,
  RemoteServer,
  TicketManagementConfigWrapper,
} from "../model/config/remote-config";
import { JobNameMapping, Workload, WorkloadConfigWrapper, WorkloadId } from "../model/config/workload-config";

const DEFAULT_TICKET_PRIORITIES = ["Lowest", "Low", "Medium", "High", "Highest"];

/**
 * Find a workload by its ID.
 * @param id
 * @returns Workload or null if not found
 */
export const getWorkloadById = (id: WorkloadId): Workload | null =>
  getConfig().workloadConfigs.workloads.find((workload) => workload.id === id);

/**
 * Find all the workloads that have the given repo group.
 */
export const getWorkloadsWithRepoGroup = (repoGroup: string): Workload[] =>
  getConfig().workloadConfigs.workloads.filter((w) => Object.keys(w.codeManagement.repoGroups).includes(repoGroup));

/**
 * List all workloads in the configuration.
 */
export const listWorkloads = (): Workload[] => getConfig().workloadConfigs.workloads;

/**
 * List all workload IDs in the configuration, sorted alphabetically.
 */
export const listWorkloadIds = (): WorkloadId[] =>
  listWorkloads()
    .map((w) => w.id)
    .sort((a, b) => a.localeCompare(b));

/**
 * List all (unique) repository groups for a specified workload,
 * or all workloads if no workload ID is provided.
 */
export const listRepoGroups = (workload: Workload | null = null): string[] => {
  const workloads = workload ? [workload] : getConfig().workloadConfigs.workloads;
  const allGroups = workloads.flatMap((w) => Object.keys(w.codeManagement.repoGroups));

  return uniq(allGroups).sort((a, b) => a.localeCompare(b));
};

/**
 * List all (unique) job groups for a specified workload,
 * or all workloads if no workload ID is provided.
 */
export const listJobGroups = (workload: Workload | null = null): string[] => {
  const workloads = workload ? [workload] : getConfig().workloadConfigs.workloads;
  const allGroups = workloads.map((w) => listNormalisedJobGroupsForWorkload(w)).flatMap((jg) => Object.keys(jg));

  return uniq(allGroups).sort((a, b) => a.localeCompare(b));
};

/**
 * Determine the job groups for a given workload. If a non-empty array of job groups
 * is provided, return that list. Otherwise, return all job groups for the workload.
 * @param workload
 * @param jobGroups
 */
export const determineJobGroups = (workload: Workload, jobGroups: string[]): string[] => {
  let jGroups = jobGroups;
  if (!jGroups.length) {
    // assume no filter implies all
    jGroups = listJobGroups(workload);
  }
  return jGroups;
};

/**
 * Determine the job names for a given workload and job group.
 * @param workload
 * @param jobGroup
 */
export const determineJobNames = async (workload: Workload, jobGroup: string): Promise<string[]> => {
  if (workload.pipelines.jobNameMapping === JobNameMapping.ComponentName) {
    return await getComponentsForWorkloadId([jobGroup], workload.id);
  } else if (workload.pipelines.jobNameMapping === JobNameMapping.RepoName) {
    return await getReposForWorkloadId([jobGroup], workload.id);
  } else {
    const discoveries = workload.pipelines.stages.map(async ({ stageId }) => {
      const pipelinesService = getPipelinesForWorkload(workload, stageId);
      return (await pipelinesService.discoverJobNames(workload, jobGroup)) ?? [];
    });
    return (await Promise.all(discoveries)).flat();
  }
};

/**
 * Returns defined branch names for a given vcs service, or
 * all unique branch names configured across remote sources
 * if not specifically defined
 *
 * TODO: Refactor data model to group with repoName definition
 *
 * @returns string[]
 */
export const getVcsBranches = (vcsServiceName?: string): string[] => {
  let branches: string[] = [];
  if (!vcsServiceName) {
    for (const vcsName in CodeManagementTypes) {
      const vcsServers: CodeManagementServer[] =
        getConfig().remoteConfigs.codeManagement[CodeManagementTypes[vcsName]]?.servers;

      if (vcsServers) {
        branches.push(...vcsServers.flatMap((s) => s.branches));
      }
    }
  } else {
    const servers: CodeManagementServer[] = getConfig().remoteConfigs.codeManagement[vcsServiceName]?.servers;
    branches = servers?.length > 0 ? servers?.flatMap((s) => s.branches) : [];
  }
  return uniq(branches).sort((a, b) => a.localeCompare(b));
};

/**
 * List all unique ticket priorities defined across all
 * workloads and remote server defaults.
 */
export const getAllTicketPriorities = (): string[] => {
  const priorities = [];
  getAllWorkloadConfig().workloads.forEach((w) => {
    const serverType = w.projectManagement.type;
    const serverDefaults = getAllTicketManagementConfig()[serverType].servers.flatMap((s) => s.defaults);

    // not all providers support 'ticketPriorities'
    const ticketPriorities = serverDefaults["ticketPriorities"];
    if (ticketPriorities && Array.isArray(ticketPriorities)) {
      priorities.push(...ticketPriorities);
    }
  });
  return uniq(priorities) ?? DEFAULT_TICKET_PRIORITIES;
};

export const getAllCodeManagementUrls = (): Record<string, string> => {
  const urls = {};
  getAllWorkloadConfig().workloads.forEach((w) => {
    const serverType = w.codeManagement.type;
    const servers = getAllCodeManagementConfig()[serverType].servers;
    const server = getServerConfig(servers, w.codeManagement.serverId);
    const url = server.url || (serverType === CodeManagementTypes.GITHUB ? "https://github.com" : "");
    urls[w.id] = url + "/" + w.codeManagement.projectName;
  });
  return urls;
};

export const getAllIssueManagementUrls = (): Record<string, string> => {
  const urls = {};
  getAllWorkloadConfig().workloads.forEach((w) => {
    const serverType = w.projectManagement.type;
    const servers = getAllTicketManagementConfig()[serverType].servers;
    const server = getServerConfig(servers, w.projectManagement.serverId);
    urls[w.id] = server.url;
  });
  return urls;
};

export const getAllCodeAnalysisConfig = (): CodeAnalysisConfigWrapper => getConfig().remoteConfigs.codeAnalysis;

export const getAllCodeManagementConfig = (): CodeManagementConfigWrapper => getConfig().remoteConfigs.codeManagement;

export const getAllPipelinesConfig = (): PipelinesConfigWrapper => getConfig().remoteConfigs.pipelines;

export const getAllTicketManagementConfig = (): TicketManagementConfigWrapper =>
  getConfig().remoteConfigs.ticketManagement;

/**
 * Last resort => return full Remote Config object
 *
 * @returns full Remote Config object
 */
export const getAllRemoteConfig = (): RemoteConfigWrapper => getConfig().remoteConfigs;

/**
 * Last resort => return full Workload Config object
 *
 * @returns full Workload Config object
 */
export const getAllWorkloadConfig = (): WorkloadConfigWrapper => getConfig().workloadConfigs;

/**
 * Get a server configuration by ID from a list of servers.
 * @param servers
 * @param serverId
 */
export const getServerConfig = <T extends RemoteServer>(servers: T[], serverId: string): T => {
  const server = servers?.find((j) => j.id === serverId);
  if (!server) {
    throw new Error(`Unable to find server entry with ID: ${serverId}`);
  }
  return server;
};

/**
 * List all unique tags pairs defined across all workloads.
 */
export const listAllTagPairs = (): Record<string, string[]> => {
  const workloads = getConfig().workloadConfigs.workloads;
  const tags: Record<string, string[]> = {};
  for (const w of workloads) {
    for (const [k, v] of Object.entries(w.tags ?? {})) {
      if (!tags[k]) {
        tags[k] = [];
      }
      tags[k].push(v);
    }
  }
  for (const [key, values] of Object.entries(tags)) {
    tags[key] = uniq(values);
  }
  return tags;
};

/**
 * Get all workloads that have the given tag keys and values. Not all
 * tags have to be present on a workload for it to be included.
 * @param tags
 */
export const getWorkloadsWithTags = (tags: { key: string; value: string }[]): WorkloadId[] => {
  return getConfig()
    .workloadConfigs.workloads.filter((w) => {
      return tags.find(({ key, value }) => w.tags?.[key] === value);
    })
    .map((w) => {
      return w.id;
    });
};
