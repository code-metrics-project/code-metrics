import { Request, Response } from "express";
import {
  determineJobGroups,
  determineJobNames,
  getAllTicketPriorities,
  getVcsBranches,
  listAllTagPairs,
  listWorkloads,
} from "../config/configMapping";
import { getConfig, hasConfig } from "../config/config";
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
import { getConfigItem } from "../config/sources/source";

const authSessionStoreMethod: AuthSessionStoreMethod =
  (getConfigItem("CLIENT_SESSION_STORE") as AuthSessionStoreMethod) || "cookie";

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
    features: listActiveFeatures(),
    hasConfig: hasConfig(),
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
  };
  res.json(config);
};
