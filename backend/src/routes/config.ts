import { Request, Response } from "express";
import {
  determineJobGroups,
  determineJobNames,
  getAllTicketPriorities,
  getVcsBranches,
  listAllTagPairs,
  listWorkloads,
  getAllLlmConfig,
} from "../config/configMapping";
import { CONFIG_CACHE_TTL_MS, getConfig, hasConfig, hasWorkloads } from "../config/config";
import { listActiveFeatures } from "../utils/features";
import { getReposForWorkloadId } from "../utils/repos";
import { getVcsForWorkload } from "../services/codeManagement/vcsService";
import { getAuthenticator } from "../auth/auth";
import {
  AuthSessionStoreMethod,
  BootstrapConfig,
  RepoInfo,
  SystemConfig,
  WorkloadMeta,
} from "../model/config/system-config";
import { isLicensed } from "../license/validate";
import { getEnvConfigItem } from "../config/sources/source";

const authSessionStoreMethod: AuthSessionStoreMethod =
  (getEnvConfigItem("CLIENT_SESSION_STORE") as AuthSessionStoreMethod) || "cookie";

const getBootstrapConfigCacheTtlMs = (): number => {
  return getEnvConfigItem("LAZY_LOAD_CONFIG_DISABLED") === "true" ? 0 : (CONFIG_CACHE_TTL_MS ?? 0);
};

/**
 * Check if LLM is configured by verifying that remote config has LLM settings
 * with a server configured.
 */
const isLlmEnabled = (): boolean => {
  const llmConfig = getAllLlmConfig();
  if (!llmConfig) {
    return false;
  }

  // Check if either Claude or Gemini has a server configured
  const hasClaudeServer = !!llmConfig.claude?.server;
  const hasGeminiServer = !!llmConfig.gemini?.server;

  return hasClaudeServer || hasGeminiServer;
};

/**
 * List repos, in repo groups, for each workload.
 */
const getWorkloadMeta = async (): Promise<WorkloadMeta[]> => {
  const workloads: WorkloadMeta[] = [];
  for (const workload of listWorkloads()) {
    const repos: Record<string, RepoInfo[]> = {};
    const vcs = getVcsForWorkload(workload);

    for (const rg of Object.keys(workload.codeManagement.repoGroups)) {
      const repoNames = await getReposForWorkloadId([rg], workload.id);
      repos[rg] = repoNames.map((repoName) => {
        return <RepoInfo>{
          name: repoName,
          url: vcs.buildRepoLink(workload.id, repoName),
        };
      });
    }

    const jobGroups = determineJobGroups(workload, []);
    const jobs: Record<string, string[]> = {};
    for (const jg of jobGroups) {
      jobs[jg] = await determineJobNames(workload, jg);
    }

    const pipelineStages = workload.pipelines.stages.map((stage) => stage.stageId);

    workloads.push({
      id: workload.id,
      name: workload.name,
      jobs,
      repos,
      pipelineStages,
    });
  }
  return workloads;
};

// GET /api/system/bootstrap
// Note: this call is unauthenticated, so no sensitive data should be returned.
export const fetchBootstrap = async (_req: Request, res: Response<BootstrapConfig>): Promise<void> => {
  const config: BootstrapConfig = {
    apiVersion: getConfig()?.metadata?.version,
    auth: {
      loginUrl: getAuthenticator().loginUrl,
      store: authSessionStoreMethod,
    },
    configCacheTtlMs: getBootstrapConfigCacheTtlMs(),
    features: listActiveFeatures(),
    hasConfig: hasConfig(),
    hasWorkloads: hasWorkloads(),
    isLicensed: await isLicensed(),
  };
  res.json(config);
};

// GET /api/system/config
export const fetchConfig = async (_req: Request, res: Response<SystemConfig>): Promise<void> => {
  const workloads = await getWorkloadMeta();
  const config: SystemConfig = {
    branches: getVcsBranches(),
    issuePriorities: getAllTicketPriorities(),
    tags: listAllTagPairs(),
    workloads,
    llmEnabled: isLlmEnabled(),
  };
  res.json(config);
};
