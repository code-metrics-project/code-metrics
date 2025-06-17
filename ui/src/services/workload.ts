import { getConfig, listWorkloads } from "@/utils/config";
import { type WorkloadDetail } from "@/model/config";
import { chooseColour } from "@/utils/colours";

export function getWorkloadDetails(): WorkloadDetail[] {
  return listWorkloads().map((w, idx) => ({
    ...w,
    color: chooseColour(idx),
    repos: countReposForWorkload(w.id),
  }));
}

function countReposForWorkload(workloadId: string): Record<string, number> {
  const workload = getConfig().systemConfig.workloads.find(
    (w) => w.id === workloadId
  );
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
