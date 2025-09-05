import axios from "axios";
import {
  type BootstrapConfig,
  type RepoInfo,
  type SystemConfig,
  type WebConfig,
  type WorkloadInfo,
} from "@/model/config";
import { SYSTEM_BOOTSTRAP, SYSTEM_CONFIG } from "@/utils/urls";
import { logger } from "@/utils/logger";
import { capitalize, uniq } from "lodash";
import { retryOperationUntilTimeout } from "@/utils/retry.ts";

export interface ConfigHolder {
  systemConfig: SystemConfig;
  webConfig: WebConfig;
}

let webConfig: WebConfig;
let bootstrapConfig: BootstrapConfig;
let systemConfig: SystemConfig;

/**
 * Configuration for the web application itself.
 */
export async function fetchWebConfig(): Promise<Record<string, any>> {
  if (!webConfig) {
    try {
      webConfig = await fetchConfig("/config.json");
    } catch (e) {
      console.error("Failed to retrieve app config", e);
      throw e;
    }
  }
  return webConfig;
}

/**
 * System bootstrap served by the backend.
 */
export async function fetchSystemBootstrap(): Promise<SystemConfig> {
  if (!bootstrapConfig) {
    try {
      bootstrapConfig = await retryOperationUntilTimeout(
        {
          name: "Fetch bootstrap config",
          timeout: 300_000, // 5 minutes
        },
        async () => fetchConfig(SYSTEM_BOOTSTRAP),
      );
      logger("Retrieved bootstrap config", bootstrapConfig);
    } catch (e) {
      console.error("Failed to retrieve system config", e);
      throw e;
    }
  }
  return systemConfig;
}

/**
 * System configuration served by the backend.
 */
export async function fetchSystemConfig(authToken: string): Promise<SystemConfig> {
  if (!systemConfig) {
    try {
      systemConfig = await fetchConfig(SYSTEM_CONFIG, authToken);
      logger("Retrieved system config", systemConfig);
    } catch (e) {
      console.error("Failed to retrieve system config", e);
      throw e;
    }
  }
  return systemConfig;
}

async function fetchConfig(url: string, authToken?: string): Promise<any> {
  const config = authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {};

  /*
   * Need to create a new axios instance here to avoid Pinia store checks in
   * our axios interceptors which fail because Vue/Pinia have not initialised yet.
   */
  const client = axios.create(config);
  const { data } = await client.get(url);
  return data;
}

export function getBootstrap(): BootstrapConfig {
  return bootstrapConfig;
}

export function getConfig(): ConfigHolder {
  return { systemConfig, webConfig };
}

export function listWorkloadIds(): string[] {
  const workloadIds = listWorkloads().map((w) => w.id);
  workloadIds.sort();
  return workloadIds;
}

export function listWorkloads(): WorkloadInfo[] {
  const workloads = getConfig().systemConfig.workloads.map((w) => {
    return {
      id: w.id,
      name: w.name ?? capitalize(w.id),
    };
  });
  workloads.sort((a, b) => a.name.localeCompare(b.name));
  return workloads;
}

export function listRepoGroups(): string[] {
  const repoGroups = getConfig().systemConfig.workloads.flatMap((w) => Object.keys(w.repos));
  repoGroups.sort();
  return uniq(repoGroups);
}

export function listJobGroups(): string[] {
  const jobGroups = getConfig().systemConfig.workloads.flatMap((w) => Object.keys(w.jobs));
  jobGroups.sort();
  return uniq(jobGroups);
}

function getRepoInfosForWorkloadId(workloadId: string): RepoInfo[] {
  const reposByGroup = getConfig().systemConfig.workloads.find((w) => w.id === workloadId)?.repos;

  if (!reposByGroup) {
    return [];
  }

  return Object.values(reposByGroup).flat();
}

export function getReposForWorkloadId(workloadId: string): string[] {
  const repos = getRepoInfosForWorkloadId(workloadId).map((repo) => repo.name);
  repos.sort();
  return uniq(repos);
}

export function getUrlForRepo(workloadId: string, repoName: string): string {
  return getRepoInfosForWorkloadId(workloadId).find((repo) => repo.name === repoName)?.url ?? "";
}

export function listAllTagKeys(): string[] {
  const tags = getConfig().systemConfig.tags;
  if (!tags) return [];
  return Object.keys(tags).sort();
}
