import client from "@/api/client";
import {
  type BootstrapConfig,
  type RepoInfo,
  type SystemConfig,
  type WebConfig,
  type WorkloadInfo,
} from "@/model/config";
import { SYSTEM_BOOTSTRAP, SYSTEM_CONFIG } from "@/api/endpoints";
import { logger } from "@/utils/logger";
import { capitalize } from "@/utils/string";
import { uniq } from "@/utils/array";
import { retryOperationUntilTimeout } from "@/utils/retry";

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
export async function fetchWebConfig(): Promise<WebConfig> {
  if (!webConfig) {
    try {
      webConfig = (await fetchConfig("/config.json")) as WebConfig;
    } catch (e) {
      console.error("Failed to retrieve app config", e);
      throw e;
    }
  }
  return webConfig;
}

/** Default 2 minutes; override with VITE_BOOTSTRAP_RETRY_TIMEOUT for testing. */
const BOOTSTRAP_RETRY_TIMEOUT = Number(import.meta.env.VITE_BOOTSTRAP_RETRY_TIMEOUT) || 120_000;

/**
 * System bootstrap served by the backend.
 * Retries with exponential back-off (1 s → 2 s → 4 s → … capped at 30 s)
 * up to a 2-minute timeout to handle cold starts (e.g. Lambda).
 */
export async function fetchSystemBootstrap(): Promise<BootstrapConfig> {
  if (!bootstrapConfig) {
    try {
      bootstrapConfig = (await retryOperationUntilTimeout(
        {
          name: "Fetch bootstrap config",
          timeout: BOOTSTRAP_RETRY_TIMEOUT,
          backoff: 2,
        },
        async () => fetchConfig(SYSTEM_BOOTSTRAP)
      )) as BootstrapConfig;
      logger("Retrieved bootstrap config", bootstrapConfig);
    } catch (e) {
      console.error("Failed to retrieve bootstrap config", e);
      throw e;
    }
  }
  return bootstrapConfig;
}

/**
 * System configuration served by the backend.
 */
export async function fetchSystemConfig(authToken: string): Promise<SystemConfig> {
  if (!systemConfig) {
    try {
      systemConfig = (await fetchConfig(SYSTEM_CONFIG, authToken)) as SystemConfig;
      logger("Retrieved system config", systemConfig);
    } catch (e) {
      console.error("Failed to retrieve system config", e);
      throw e;
    }
  }
  return systemConfig;
}

async function fetchConfig(url: string, authToken?: string): Promise<unknown> {
  const config = authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {};

  // Use the shared client so interceptors (401 handling) apply
  const { data } = await client.get(url, config);
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
  const config = getConfig();
  if (!config.systemConfig?.workloads) {
    return [];
  }
  const workloads = config.systemConfig.workloads.map((w) => {
    return {
      id: w.id,
      name: w.name ?? capitalize(w.id),
    };
  });
  workloads.sort((a, b) => a.name.localeCompare(b.name));
  return workloads;
}

export function listRepoGroups(): string[] {
  const config = getConfig();
  if (!config.systemConfig?.workloads) {
    return [];
  }
  const repoGroups = config.systemConfig.workloads.flatMap((w) => Object.keys(w.repos));
  repoGroups.sort();
  return uniq(repoGroups);
}

export function listJobGroups(): string[] {
  const config = getConfig();
  if (!config.systemConfig?.workloads) {
    return [];
  }
  const jobGroups = config.systemConfig.workloads.flatMap((w) => Object.keys(w.jobs ?? {}));
  jobGroups.sort();
  return uniq(jobGroups);
}

function getRepoInfosForWorkloadId(workloadId: string): RepoInfo[] {
  const config = getConfig();
  if (!config.systemConfig?.workloads) {
    return [];
  }
  const reposByGroup = config.systemConfig.workloads.find((w) => w.id === workloadId)?.repos;

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

export function getJobsForWorkloadId(workloadId: string): string[] {
  const config = getConfig();
  const jobsByGroup = config.systemConfig?.workloads?.find((w) => w.id === workloadId)?.jobs;

  if (!jobsByGroup) {
    return [];
  }

  const jobs = Object.values(jobsByGroup).flat();
  jobs.sort();
  return uniq(jobs);
}

export function getUrlForRepo(workloadId: string, repoName: string): string {
  return getRepoInfosForWorkloadId(workloadId).find((repo) => repo.name === repoName)?.url ?? "";
}

export function listAllTagKeys(): string[] {
  const config = getConfig();
  const tags = config.systemConfig?.tags;
  if (!tags) return [];
  return Object.keys(tags).sort();
}
