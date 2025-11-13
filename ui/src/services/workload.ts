import { getConfig, listWorkloads } from "@/utils/config";
import { type WorkloadDetail, type RepoInfo } from "@/model/config";
import { chooseColour } from "@/utils/colours";

export type RepositoryDetail = {
  name: string;
  url: string;
  workloadId: string;
  workloadName: string;
  repoGroups: string[];
};

export function getWorkloadDetails(): WorkloadDetail[] {
  return listWorkloads().map((w, idx) => ({
    ...w,
    color: chooseColour(idx),
    repos: countReposForWorkload(w.id),
  }));
}

function countReposForWorkload(workloadId: string): Record<string, number> {
  const workload = getConfig().systemConfig.workloads.find((w) => w.id === workloadId);
  if (!workload) {
    return {};
  }
  const repos: Record<string, number> = {};
  Object.entries(workload.repos).forEach(([repoGroup, repositories]) => {
    repos[repoGroup] = repositories.length;
  });
  return repos;
}

export function getWorkloadDetail(workloadId: string): WorkloadDetail {
  return getWorkloadDetails().find((w) => w.id === workloadId)!;
}

/**
 * Get detailed information about all repositories, optionally filtered by workload ID.
 */
export function getRepositoryDetails(workloadId?: string): RepositoryDetail[] {
  const workloads = workloadId
    ? getConfig().systemConfig.workloads.filter((w) => w.id === workloadId)
    : getConfig().systemConfig.workloads;

  const repositories: RepositoryDetail[] = [];

  for (const workload of workloads) {
    const workloadName = listWorkloads().find((w) => w.id === workload.id)?.name || workload.id;

    // Track which repo groups each repository belongs to
    const repoGroupMap = new Map<string, string[]>();

    Object.entries(workload.repos).forEach(([repoGroup, repos]) => {
      repos.forEach((repo: RepoInfo) => {
        if (!repoGroupMap.has(repo.name)) {
          repoGroupMap.set(repo.name, []);
        }
        repoGroupMap.get(repo.name)!.push(repoGroup);
      });
    });

    // Convert to repository details
    repoGroupMap.forEach((repoGroups, repoName) => {
      const repoInfo = Object.values(workload.repos)
        .flat()
        .find((r: RepoInfo) => r.name === repoName);

      if (repoInfo) {
        repositories.push({
          name: repoName,
          url: repoInfo.url,
          workloadId: workload.id,
          workloadName,
          repoGroups: repoGroups.sort(),
        });
      }
    });
  }

  // Sort by workload name, then repo name
  repositories.sort((a, b) => {
    const workloadCompare = a.workloadName.localeCompare(b.workloadName);
    if (workloadCompare !== 0) return workloadCompare;
    return a.name.localeCompare(b.name);
  });

  return repositories;
}
