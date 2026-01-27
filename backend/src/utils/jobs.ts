import { determineJobGroups, determineJobNames, getWorkloadById } from "../config/configMapping";

import { JobGroup, JobNameMapping, Workload, WorkloadId } from "../model/config/workload-config";
import uniq from "lodash/uniq";
import { matchOrEquals } from "./matchers";
import { logger } from "./logger/logger";

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

/**
 * Get all job names for the given workloads, resolving job groups as needed.
 * @param workloadIds
 * @param jobGroups
 * @param jobNames
 */
async function getAllJobNames(workloadIds: WorkloadId[], jobGroups: string[], jobNames: string[]) {
  // Resolve job groups to job names for all workloads
  const resolvedJobNames: string[] = [];
  if (jobGroups.length > 0) {
    for (const workloadId of workloadIds) {
      const workload = getWorkloadById(workloadId);
      const jGroups = determineJobGroups(workload, jobGroups);
      for (const jobGroup of jGroups) {
        const groupJobNames = await determineJobNames(workload, jobGroup);
        resolvedJobNames.push(...groupJobNames);
      }
    }
  }

  // Combine explicitly provided job names with resolved job names from groups
  const allJobNames = uniq([...jobNames, ...resolvedJobNames]);
  return allJobNames;
}

/**
 * Get all job names, resolving job groups as needed, where groups or names are potentially undefined.
 * @param workloadIds
 * @param jobGroupsRaw
 * @param jobNamesRaw
 */
export async function getAllJobNamesFromRaw(
  workloadIds: WorkloadId[],
  jobGroupsRaw: string[] | undefined,
  jobNamesRaw: string[] | undefined,
) {
  let jobNames: string[];
  if (!jobNamesRaw) {
    jobNames = [];
  } else {
    jobNames = Array.isArray(jobNamesRaw) ? jobNamesRaw.map((w) => w.toString()) : (jobNamesRaw as string).split(",");
  }

  let jobGroups: string[];
  if (!jobGroupsRaw) {
    jobGroups = [];
  } else {
    jobGroups = Array.isArray(jobGroupsRaw)
      ? jobGroupsRaw.map((w) => w.toString())
      : (jobGroupsRaw as string).split(",");
  }

  return await getAllJobNames(workloadIds, jobGroups, jobNames);
}

/**
 * Filter a list of job names by job group for a given workload.
 * @param workloadId
 * @param allJobNames
 * @param jobGroup
 */
export const filterJobsByJobGroup = (workloadId: string, allJobNames: string[], jobGroup: string): string[] => {
  const workload = getWorkloadById(workloadId);
  const jobGroups = listNormalisedJobGroupsForWorkload(workload);

  let jobPatterns: string[] = [];
  if (jobGroup) {
    jobPatterns = jobGroups[jobGroup]?.jobNames ?? [];
  } else {
    // return all job patterns if no job group is specified
    jobPatterns = Object.values(jobGroups).flatMap((group) => group.jobNames);
  }

  const jobNames = allJobNames.filter((jobName) => {
    return jobPatterns.some((jobPattern) => matchOrEquals(jobPattern, jobName));
  });
  logger(`Filtered ${jobNames.length}/${allJobNames.length} pipelines in job group: ${workload.id}/${jobGroup}`);
  return jobNames;
};
