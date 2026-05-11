import { determineJobGroups, determineJobNames, getWorkloadById } from "../config/configMapping";

import { JobGroup, JobNameMapping, JobSpec, Workload, WorkloadId } from "../model/config/workload-config";
import uniq from "lodash/uniq";
import { matchOrEquals } from "./matchers";
import { logger, warn } from "./logger/logger";

/**
 * Resolves a JobGroup's include and exclude patterns from both legacy `jobNames`
 * and the new `jobs` format (including `fromRepoGroup` references).
 *
 * @param jobGroup - The job group to resolve patterns for.
 * @param workload - The workload, required to resolve `fromRepoGroup` specs.
 */
export const resolveJobGroupPatterns = (
  jobGroup: JobGroup,
  workload?: Workload,
): { includePatterns: string[]; excludePatterns: string[] } => {
  const includePatterns: string[] = [];
  const excludePatterns: string[] = [];

  // Legacy format: all jobNames are include patterns
  if (jobGroup.jobNames) {
    includePatterns.push(...jobGroup.jobNames);
  }

  // New format: jobs with optional exclude flag
  if (jobGroup.jobs) {
    for (const job of jobGroup.jobs) {
      const patterns = resolveJobSpecPatterns(job, workload);
      if (job.exclude) {
        excludePatterns.push(...patterns);
      } else {
        includePatterns.push(...patterns);
      }
    }
  }

  return { includePatterns, excludePatterns };
};

/**
 * Resolves the pattern strings for a single JobSpec.
 * For `name` specs, returns the name directly.
 * For `fromRepoGroup` specs, returns the repo values from the named repo group.
 * For `repo` specs, returns the repo name directly.
 * For `componentName` specs, looks up the repo from the workload's repo groups.
 */
const resolveJobSpecPatterns = (job: JobSpec, workload?: Workload): string[] => {
  if (job.name !== undefined) {
    return [job.name];
  }
  if (job.fromRepoGroup !== undefined) {
    const repoGroup = workload?.codeManagement?.repoGroups?.[job.fromRepoGroup];
    if (!repoGroup) {
      warn(
        `Job spec references fromRepoGroup '${job.fromRepoGroup}' which does not exist` +
          (workload ? ` in workload '${workload.id}'` : "") +
          `. Check your workload config's codeManagement.repoGroups.`,
      );
      return [];
    }
    return repoGroup.components?.map((component) => component.repo) ?? [];
  }
  if (job.repo !== undefined) {
    return [job.repo];
  }
  if (job.componentName !== undefined) {
    const allComponents = Object.values(workload?.codeManagement?.repoGroups ?? {}).flatMap(
      (rg) => rg.components ?? [],
    );
    const component = allComponents.find((c) => c.name === job.componentName);
    if (!component) {
      warn(
        `Job spec references componentName '${job.componentName}' which does not exist` +
          (workload ? ` in workload '${workload.id}'` : "") +
          `. Check your workload config's codeManagement.repoGroups components.`,
      );
      return [];
    }
    return [component.repo];
  }
  return [];
};

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
    const { includePatterns, excludePatterns } = resolveJobGroupPatterns(jg, workload);
    const included = includePatterns.some((pattern) => matchOrEquals(pattern, jobName));
    const excluded = excludePatterns.some((pattern) => matchOrEquals(pattern, jobName));
    return included && !excluded;
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

  let includePatterns: string[] = [];
  let excludePatterns: string[] = [];

  if (jobGroup) {
    const group = jobGroups[jobGroup];
    if (group) {
      const resolved = resolveJobGroupPatterns(group, workload);
      includePatterns = resolved.includePatterns;
      excludePatterns = resolved.excludePatterns;
    }
  } else {
    // aggregate patterns from all job groups
    for (const group of Object.values(jobGroups)) {
      const resolved = resolveJobGroupPatterns(group, workload);
      includePatterns.push(...resolved.includePatterns);
      excludePatterns.push(...resolved.excludePatterns);
    }
  }

  const jobNames = allJobNames.filter((jobName) => {
    const included = includePatterns.some((pattern) => matchOrEquals(pattern, jobName));
    const excluded = excludePatterns.some((pattern) => matchOrEquals(pattern, jobName));
    return included && !excluded;
  });
  logger(`Filtered ${jobNames.length}/${allJobNames.length} pipelines in job group: ${workload.id}/${jobGroup}`);
  return jobNames;
};
