import { PREvent, PREventDetail } from "../../model/vcs";
import { getWorkloadById } from "../../config/configMapping";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { getReposForWorkloadId } from "../../utils/repos";
import { logger, verbose } from "../../utils/logger/logger";
import { vcsLimiter } from "./vcs-limiter";

export const vcsPROpenTimeWithArgs = async (
  workloadIds: string[],
  repoGroups: string[],
  startDate: string,
  endDate: string,
): Promise<PREvent[]> => {
  const prMetrics: Promise<PREvent[]>[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      console.warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);

    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);
    logger(`Looking for PR open duration for projects:`, repoNames);

    for (const teamProjectKey of repoNames) {
      const metrics = vcsLimiter.schedule(() =>
        vcs.getPROpenTimeFromRepo(
          workloadId,
          workload.codeManagement.projectName,
          teamProjectKey,
          new Date(startDate),
          new Date(endDate),
        ),
      );
      prMetrics.push(metrics);
    }
  }

  const result: PREvent[] = (await Promise.all(prMetrics)).flat();

  verbose(`PR open time report:`, result);
  return result;
};

export const vcsPRSizeWithArgs = async (
  workloadIds: string[],
  repoGroups: string[],
  startDate: string,
  endDate: string,
): Promise<PREventDetail[]> => {
  const prMetrics: Promise<PREventDetail[]>[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      console.warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);

    const repoNames = await getReposForWorkloadId(repoGroups, workloadId);
    logger(`Looking for PR open duration for projects:`, repoNames);

    for (const teamProjectKey of repoNames) {
      const metrics = vcsLimiter.schedule(() =>
        vcs.getPRSizeFromRepo(
          workloadId,
          workload.codeManagement.projectName,
          teamProjectKey,
          new Date(startDate),
          new Date(endDate),
        ),
      );
      prMetrics.push(metrics);
    }
  }

  const result: PREventDetail[] = (await Promise.all(prMetrics)).flat();

  verbose(`PR open time report:`, result);
  return result;
};
