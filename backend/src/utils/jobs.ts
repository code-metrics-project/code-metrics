import {getWorkloadById} from "../config/configMapping";

import {JobGroup, JobNameMapping, Workload, WorkloadId} from "../model/config/workload-config";

/**
 * Lists all the job groups for a workload, normalised by the job name mapping.
 * @param workload
 */
export const listNormalisedJobGroupsForWorkload = (workload: Workload): Record<string, JobGroup> => {
  if (workload.pipelines.jobNameMapping === JobNameMapping.RepoName) {
    const converted = Object.entries(workload.codeManagement.repoGroups).map(([repoGroupName, repoGroup]) => {
      return {
        [repoGroupName]: {
          jobNames: repoGroup.components?.flatMap((repoGroup) => repoGroup.repo) ?? [],
        },
      };
    });
    return Object.assign({}, ...converted);
  }
  return workload.pipelines.jobGroups ?? {};
};

/**
 * Lookup the job group for a given job name within the context of a workload.
 * @param workloadId
 * @param jobName
 * @param defaultValue
 */
export const lookupJobGroupForJobName = (
  workloadId: WorkloadId,
  jobName: string,
  defaultValue = "unknown",
): string | null => {
  const workload = getWorkloadById(workloadId);
  const jobGroup = Object.entries(listNormalisedJobGroupsForWorkload(workload)).find(([, jg]) => {
    return jg.jobNames.includes(jobName);
  });
  return jobGroup?.[0] ?? defaultValue;
};
