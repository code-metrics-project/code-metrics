import { error, logger } from "../../utils/logger/logger";
import { listWorkloads } from "../../config/configMapping";
import { CACHE_REPO_LIST, getVcsForWorkload } from "./vcsService";
import { InvocationMode } from "../../model/global";
import { getConfigItem } from "../../config/sources/source";

export const PRECACHE_REPO_LIST = getConfigItem("PRECACHE_REPO_LIST") !== "false";

export const precacheRepoList = async () => {
  if (!CACHE_REPO_LIST) {
    logger("Skipping repository precache as caching is disabled");
    return;
  }
  logger("Precaching repositories...");
  try {
    for (const workload of listWorkloads()) {
      const vcsProjectName = workload.codeManagement.projectName;
      logger(`Precaching repository list for ${workload.id}/${vcsProjectName}`);
      const vcs = getVcsForWorkload(workload);
      await vcs.getReposForProject(workload.id, vcsProjectName);
    }
    logger("Repository precache complete");
  } catch (e) {
    error("Repository precache failed", e);
    if (global.invocationMode === InvocationMode.UpdateCache) {
      throw e;
    }
  }
};
