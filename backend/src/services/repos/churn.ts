import { AggregatedFileChanges, RepoChangeSummary, RepoChurn } from "../../model/vcs";
import { getVcsBranches, getWorkloadById } from "../../config/configMapping";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { getReposForWorkloadId } from "../../utils/repos";
import { logger, verbose } from "../../utils/logger/logger";
import { vcsLimiter } from "./vcs-limiter";
import { DatedMetricEntry } from "../../model/metrics";
import { aggregateChanges } from "./changes";
import { Workload } from "../../model/config/workload-config";

export const vcsRepoChurnWithArgs = async (
  workloadIds: string[],
  repoGroups: string[],
  startDate: string,
  endDate: string,
): Promise<RepoChurn[]> => {
  const churnPromises: Promise<RepoChurn>[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId);
    if (!workload) {
      console.warn(`Could not find workload with team ID: ${workloadId}`);
      continue;
    }
    const vcs = getVcsForWorkload(workload);

    // TODO: Refactor data model with repoName
    const branches = getVcsBranches(workload.codeManagement.type);

    for (const repoGroup of repoGroups) {
      const repoNames = await getReposForWorkloadId([repoGroup], workloadId);
      logger(`Looking for churn in ${repoNames.length} projects`);

      for (const repositoryName of repoNames) {
        const churnPromise = vcsLimiter.schedule(async () => {
          const changes = await vcs.summariseChangesInDateRange(
            workload.id,
            workload.codeManagement.projectName,
            repositoryName,
            branches, // TODO: Move alongside repoName config
            startDate,
            endDate,
          );
          return convertChangesToMetrics(workload, repoGroup, repositoryName, changes);
        });
        churnPromises.push(churnPromise);
      }
    }
  }

  const result: RepoChurn[] = await Promise.all(churnPromises);
  verbose(`Repo churn report:`, result);
  return result;
};

const convertChangesToMetrics = (
  workload: Workload,
  repoGroup: string,
  teamProjectKey: string,
  changes: DatedMetricEntry<RepoChangeSummary>[],
): RepoChurn => {
  const metrics: DatedMetricEntry<AggregatedFileChanges>[] = changes.map((change) => {
    const aggregatedChanges = aggregateChanges(change.value.changes);
    return { date: change.date, value: aggregatedChanges };
  });
  return {
    workloadId: workload.id,
    repoGroup,
    projectName: workload.codeManagement.projectName,
    repoName: teamProjectKey,
    changes: metrics,
  };
};
