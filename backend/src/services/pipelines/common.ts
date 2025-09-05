import { RunWithMetadata } from "../../model/runs";
import { getWorkloadById } from "../../config/configMapping";
import { getPipelinesForWorkload } from "./pipelinesService";
import { Workload, WorkloadId, WorkloadPipelineStage } from "../../model/config/workload-config";
import { verbose, warn } from "../../utils/logger/logger";
import { getDeploymentService } from "../deployment/deploymentService";
import { lookupJobGroupForJobName } from "../../utils/jobs";
import { dateDiffDays, getRelativeDate, walkDateRange } from "../../utils/date";

/**
 * Fetches runs for the given workloads, job groups, branches, and date range.
 * @param workloadIds
 * @param stageId
 * @param jobGroups
 * @param branches
 * @param startDate
 * @param endDate
 */
export const fetchRuns = async (
  workloadIds: WorkloadId[],
  stageId: string,
  jobGroups: string[],
  branches: string[],
  startDate: Date,
  endDate: Date,
): Promise<RunWithMetadata[]> => {
  const allRuns: RunWithMetadata[] = [];

  for (const workloadId of workloadIds) {
    const workload = getWorkloadById(workloadId as WorkloadId);
    if (!workload) {
      warn(`Could not find workload with ID: ${workloadId}`);
      continue;
    }

    const pipelines = getPipelinesForWorkload(workload, stageId);
    const workloadRuns = await pipelines.getRunsForJobGroups(workloadId, jobGroups, branches, startDate, endDate);
    allRuns.push(...workloadRuns);
  }

  return allRuns;
};

/**
 * Fetches a run by ID from a given job in a workload.
 * @param workloadId
 * @param stageId
 * @param jobName
 * @param runId
 */
export const fetchRunById = async (
  workloadId: string,
  stageId: string,
  jobName: string,
  runId: string,
): Promise<RunWithMetadata | undefined> => {
  const workload = getWorkloadById(workloadId as WorkloadId);
  if (!workload) {
    warn(`Could not find workload with ID: ${workloadId}`);
    return undefined;
  }

  const pipelines = getPipelinesForWorkload(workload, stageId);
  return await pipelines.getRunById(workloadId, jobName, runId);
};

/**
 * Generates a URL for a run by ID from a given job in a workload.
 * @param workloadId
 * @param stageId
 * @param jobName
 * @param runId
 */
export const fetchRunUrl = (
  workloadId: string,
  stageId: string,
  jobName: string,
  runId: string,
): string | undefined => {
  const workload = getWorkloadById(workloadId as WorkloadId);
  if (!workload) {
    warn(`Could not find workload with ID: ${workloadId}`);
    return undefined;
  }

  const pipelines = getPipelinesForWorkload(workload, stageId);
  return pipelines.buildRunLink(workloadId, jobName, runId);
};

const MAX_DAYS_TO_SEARCH = 3;

async function findDownstreamRuns(
  workload: Workload,
  stageId: string,
  jobGroup: string,
  branch: string,
  commitId: string,
  run: RunWithMetadata,
): Promise<RunWithMetadata[]> {
  const allStageIds = workload.pipelines.stages.map((stage) => stage.stageId);
  const subsequentStageIds = allStageIds.slice(allStageIds.indexOf(stageId) + 1);
  verbose(`Subsequent stage IDs: ${subsequentStageIds}`);

  const inputRunStartDate = new Date(run.run.startDate);
  const daysToSearch = Math.min(MAX_DAYS_TO_SEARCH, dateDiffDays(inputRunStartDate, new Date()));
  const searchEndDate = getRelativeDate(inputRunStartDate, daysToSearch);
  verbose(
    `Searching for deployments for run ${run.run.id} from ${inputRunStartDate.toISOString()} to ${searchEndDate.toISOString()}`,
  );

  const pipelines = getPipelinesForWorkload(workload, stageId);
  const deploymentService = getDeploymentService();

  const found: RunWithMetadata[] = [];

  for (const subsequentStageId of subsequentStageIds) {
    await walkDateRange(inputRunStartDate, searchEndDate, async (current) => {
      const nextDay = getRelativeDate(current, 1);
      const subsequentRuns = await pipelines.getRunsForJobGroups(workload.id, [jobGroup], [branch], current, nextDay);
      for (const subsequentRun of subsequentRuns) {
        try {
          const subsequentCommitId = await deploymentService.findCommitIdForRun(
            workload.id,
            subsequentStageId,
            subsequentRun.run,
          );
          if (subsequentCommitId === commitId) {
            verbose(
              `Found deployment for run ${run.run.id} in stage ${subsequentStageId} with ID ${subsequentRun.run.id}`,
            );
            found.push(subsequentRun);
          }
        } catch (e) {
          warn(`Error finding commit ID for run ${subsequentRun.run.id}: ${e}`);
        }
      }
    });
  }

  verbose(`Found ${found.length} deployments for run ${run.run.id}`);
  return found;
}

/**
 * Fetches deployments for a given run.
 * @param workloadId
 * @param stageId
 * @param jobName
 * @param runId
 */
export const fetchDeploymentsForRun = async (
  workloadId: string,
  stageId: string,
  jobName: string,
  runId: string,
): Promise<RunWithMetadata[]> => {
  const workload = getWorkloadById(workloadId as WorkloadId);
  if (!workload) {
    warn(`Could not find workload with ID: ${workloadId}`);
    return [];
  }

  const jobGroup = lookupJobGroupForJobName(workloadId, jobName, null);
  if (!jobGroup) {
    warn(`Could not find job group for job name: ${jobName}`);
    return [];
  }

  const pipelines = getPipelinesForWorkload(workload, stageId);
  const run = await pipelines.getRunById(workloadId, jobName, runId);
  if (!run) {
    warn(`Could not find run with ID: ${runId}`);
    return [];
  }

  const branch = run.run.branch;

  const deploymentService = getDeploymentService();
  const commitId = await deploymentService.findCommitIdForRun(workloadId, stageId, run.run);
  verbose(`Found commit ID ${commitId} for run ${runId}`);

  // find all pipeline runs from the workload's deployment provider where the start date >= this run's start date
  const found = await findDownstreamRuns(workload, stageId, jobGroup, branch, commitId, run);
  return found;
};

/**
 * Fetches the workload pipeline stage for a given workload and stage ID.
 * @param workload
 * @param stageId
 */
export const getPipelineStage = (workload: Workload, stageId: string): WorkloadPipelineStage => {
  const pipelineStage = workload.pipelines.stages.find((stage) => stage.stageId === stageId);
  if (!pipelineStage) {
    throw new Error(`No pipeline stage configuration found for workload: ${workload.id} with stage: ${stageId}`);
  }
  return pipelineStage;
};

/**
 * Maps the job name using the stage configuration.
 * @param workload
 * @param jobName
 * @param stageId
 * @private
 */
export const mapJobNameUsingStageConfig = (workload: Workload, jobName: string, stageId: string) => {
  const pipelineStage = getPipelineStage(workload, stageId);
  return pipelineStage.jobMapping?.[jobName] ?? jobName;
};

/**
 * Maps an array of job names using the stage configuration.
 * @param workload
 * @param jobNames
 * @param stageId
 */
export const mapJobNamesUsingStageConfig = (workload: Workload, jobNames: string[], stageId: string) => {
  return jobNames.map((jobName) => mapJobNameUsingStageConfig(workload, jobName, stageId));
};
