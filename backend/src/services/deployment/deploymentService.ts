import { Run } from "../../model/runs";
import { getConfig } from "../../config/config";
import { PullRequest } from "../../model/vcs";
import { getVcsForWorkload } from "../codeManagement/vcsService";
import { addSeconds } from "date-fns";
import { determineJobGroups, determineJobNames, getWorkloadById } from "../../config/configMapping";
import { getPipelines, PipelinesService } from "../pipelines/pipelinesService";
import { truncateDateOnly, walkDateRange } from "../../utils/date";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { mapCommitUsingRunProperty } from "./commitMapper";
import { DateBounds } from "../../model/datetime";
import { provideDatastore } from "../../db/factory";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { StageConfig, StageConfigWrapper } from "../../model/config/pipeline-config";
import { LEGACY_FIRST_STAGE_ID } from "./common";
import { getConfigItemAsNumber } from "../../config/sources/source";

const COLLECTION_NAME_DEPLOY_BOUNDS = "deploy-bounds";
const EXPIRY_SECONDS: number = getConfigItemAsNumber("EXPIRY_SECONDS", 3600)!;

type DailyTotalDeploy = {
  run: string;
  job: string;
  repo: string;
  earliestCommit: Date;
  deployed: Date;
  leadTime: number;
};

export type DailyTotal = {
  total: number;
  count: number;
  deploys: DailyTotalDeploy[];
};

export type DeploymentService = {
  /**
   * Get the pipeline stage configuration for a workload.
   * @param workload
   * @param stageId
   */
  getStageConfigForWorkload: (workload: Workload, stageId: string) => StageConfig;

  /**
   * Find the commit ID associated with a run.
   * @param workloadId
   * @param stageId
   * @param run
   */
  findCommitIdForRun: (workloadId: string, stageId: string, run: Run) => Promise<string>;

  /**
   * Find the PR associated with a run.
   * @param workloadId
   * @param stageId
   * @param run
   */
  findPrForRun: (workloadId: WorkloadId, stageId: string, run: Run) => Promise<PullRequest>;

  /**
   * Get the date bounds from the first commit in the PR to the end of the run.
   * @param workloadId
   * @param stageId
   * @param run
   */
  getDateBounds: (workloadId: WorkloadId, stageId: string, run: Run) => Promise<DateBounds>;

  /**
   * Fetch all deployments for a workload between two dates, grouped by job group.
   * @param workloadId
   * @param stageId
   * @param jobGroups
   * @param startDate
   * @param endDate
   */
  fetchDeployments: (
    workloadId: WorkloadId,
    stageId: string,
    jobGroups: string[],
    startDate: Date,
    endDate: Date,
  ) => Promise<Record<string, Run[]>>;

  /**
   * Calculate all lead times for a workload between two dates.
   * @param workloadId
   * @param stageId
   * @param startDate
   * @param endDate
   */
  calculateLeadTimes: (
    workloadId: WorkloadId,
    stageId: string,
    jobGroups: string[],
    startDate: Date,
    endDate: Date,
  ) => Promise<Map<Date, Map<string, DailyTotal>>>;
};

let instance: DeploymentService;

export const getDeploymentService = (): DeploymentService => {
  if (!instance) {
    const allStageConfigs = getConfig().pipelineConfigs;
    if (!allStageConfigs) {
      throw new Error(`Pipeline configs not loaded`);
    }
    instance = new DeploymentServiceImpl(allStageConfigs);
  }
  return instance;
};

class DeploymentServiceImpl implements DeploymentService {
  private stageConfigs: StageConfigWrapper;
  private datastore = provideDatastore("pipeline-stages", { ttlIfToday: EXPIRY_SECONDS });

  constructor(stageConfigs: StageConfigWrapper) {
    this.stageConfigs = stageConfigs;
  }

  getStageConfigForWorkload = (workload: Workload, stageId: string): StageConfig => {
    const stages = workload.pipelines.stages;
    if (!stages?.length) {
      throw new Error(`No pipeline stages set for workload: ${workload.id}`);
    }

    if (stageId === LEGACY_FIRST_STAGE_ID) {
      // synthetic stage at the start of the pipeline
      return {
        id: LEGACY_FIRST_STAGE_ID,
        description: "Start of pipeline",
        type: workload.pipelines.type,
        serverId: workload.pipelines.serverId,
        projectName: workload.pipelines.projectName,
        commitMapping: {
          runProperty: undefined,
        },
      };
    }

    const deployConfig = this.stageConfigs.stages.find((stage) => stage.id === stageId);
    if (!deployConfig) {
      throw new Error(`No pipeline stage configuration found with ID: ${stageId}`);
    }
    return deployConfig;
  };

  findCommitIdForRun = async (workloadId: string, stageId: string, run: Run): Promise<string> => {
    logger(`Finding commit ID for workload ${workloadId} job ${run.job} stage ${stageId} run ${run.id}`);
    const workload = getWorkloadById(workloadId);
    const stage = this.getStageConfigForWorkload(workload, stageId);

    let commitId: string;
    if (stage.commitMapping.runProperty) {
      commitId = await mapCommitUsingRunProperty(workload, stageId, stage, run);
    } else {
      throw new Error(`No commit mapping configuration for workload ${workloadId} deployment pipeline: ${stage.id}`);
    }
    if (!commitId) {
      throw new Error(`No commit ID found for workload ${workloadId} deployment pipeline: ${stage.id}`);
    } else {
      logger(`Found commit ID ${commitId} for workload ${workloadId} job ${run.job} run ${run.id}`);
    }
    return commitId;
  };

  findPrForRun = async (workloadId: WorkloadId, stageId: string, run: Run): Promise<PullRequest> => {
    logger(`Finding PR for workload ${workloadId} job ${run.job} stage ${stageId} run ${run.id}`);
    const commitId = await this.findCommitIdForRun(workloadId, stageId, run);

    const workload = getWorkloadById(workloadId);
    const vcs = getVcsForWorkload(workload);

    const pr = await vcs.getPRForCommit(workloadId, workload.codeManagement.projectName, run.repo, commitId);
    if (!pr) {
      throw new Error(`No PR found for commit ${commitId} for workload ${workloadId} job ${run.job} run ${run.id}`);
    }
    logger(`Found PR ${pr.id} for commit ${commitId} for workload ${workloadId} job ${run.job} run ${run.id}`);
    return pr;
  };

  getDateBounds = async (workloadId: WorkloadId, stageId: string, run: Run): Promise<DateBounds> => {
    logger(`Calculating date bounds for ${workloadId} job ${run.job} run ${run.id}`);

    const pr = await this.findPrForRun(workloadId, stageId, run);
    const vcs = getVcsForWorkload(getWorkloadById(workloadId));

    const earliestCommit = await vcs.getEarliestCommitForPr(workloadId, pr.vcsProjectName, run.repo, pr.id);
    const bounds = {
      start: new Date(earliestCommit.date),
      end: addSeconds(new Date(run.startDate), run.duration),
    };
    logger(`Calculated date bounds for ${workloadId} job ${run.job} run ${run.id}`, bounds);
    return bounds;
  };

  calculateLeadTimes = async (
    workloadId: WorkloadId,
    stageId: string,
    jobGroups: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Map<Date, Map<string, DailyTotal>>> => {
    logger(`Calculating lead times for ${workloadId} between ${startDate} and ${endDate}`);

    const workload = getWorkloadById(workloadId);
    jobGroups = determineJobGroups(workload, jobGroups);

    // map of date to map of job group to total lead time and count
    const dailyTotals = new Map<Date, Map<string, DailyTotal>>();

    await walkDateRange(startDate, endDate, async (current) => {
      await this.#calculateTotals(dailyTotals, workload, stageId, jobGroups, current);
    });

    logger(`Calculated lead times for ${workloadId} between ${startDate} and ${endDate}`);
    return dailyTotals;
  };

  fetchDeployments = async (
    workloadId: WorkloadId,
    stageId: string,
    jobGroups: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Record<string, Run[]>> => {
    verbose(`Fetching deployments for ${workloadId} between ${startDate} and ${endDate}`);

    let stage: StageConfig;
    try {
      const workload = getWorkloadById(workloadId);
      stage = this.getStageConfigForWorkload(workload, stageId);
    } catch (e) {
      // if there is no deployment config, getDeploymentConfigForWorkload will throw an error
      warn(`Failed to fetch deployments for ${workloadId} between ${startDate} and ${endDate}: ${e}`);
      return {};
    }

    const workload = getWorkloadById(workloadId);
    const deploymentPipeline = getDeploymentPipelineProvider(workloadId, stage);
    const mainBranch = await this.#determineMainBranch(workloadId, stage);

    const deployments: Record<string, Run[]> = {};
    for (const jobGroup of jobGroups) {
      // TODO: change this into a simpler list of job names in the deployment config
      const jobNames = await determineJobNames(workload, jobGroup);

      const jobRuns = await deploymentPipeline.getRunsForProject(
        workload.id,
        jobNames,
        stage.projectName,
        [mainBranch],
        startDate,
        endDate,
      );
      verbose(`Found ${jobRuns.length} deployment runs for ${workloadId}-${jobGroup}`);
      deployments[jobGroup] = jobRuns;
    }

    logger(`Fetched deployments for ${workloadId} between ${startDate} and ${endDate}`);
    return deployments;
  };

  #determineMainBranch = async (workloadId: WorkloadId, stage: StageConfig): Promise<string> => {
    const deploymentPipeline = getDeploymentPipelineProvider(workloadId, stage);
    const branches = await deploymentPipeline.getBranchesForWorkload(workloadId);

    // TODO don't guess default branch name
    let mainBranch: string;
    if (!branches.length) {
      mainBranch = "main";
    } else {
      mainBranch = branches[0];
    }

    return mainBranch;
  };

  /**
   * Calculate the lead time for a workload's job groups on a given day.
   * @param dailyTotals
   * @param workload
   * @param stageId
   * @param jobGroups
   * @param current
   */
  #calculateTotals = async (
    dailyTotals: Map<Date, Map<string, DailyTotal>>,
    workload: Workload,
    stageId: string,
    jobGroups: string[],
    current: Date,
  ) => {
    const deployments = await this.fetchDeployments(workload.id, stageId, jobGroups, current, current);

    for (const [jobGroup, runs] of Object.entries(deployments)) {
      const currentDay = dailyTotals.get(current) ?? new Map<string, DailyTotal>();

      const currentDayJobGroup = currentDay.get(jobGroup) ?? { total: 0, count: 0, deploys: [] };

      for (const run of runs) {
        try {
          const fields = {
            workloadId: workload.id,
            date: truncateDateOnly(current),
            run: run.id,
            job: run.job,
            repo: run.repo,
          };

          const populator = async () => {
            const bounds = await this.getDateBounds(workload.id, stageId, run);
            // measured in seconds
            const leadTime = (bounds.end.getTime() - bounds.start.getTime()) / 1000;

            const deploy: DailyTotalDeploy = {
              ...fields,
              earliestCommit: bounds.start,
              deployed: bounds.end,
              leadTime,
            };
            verbose(`Calculated lead time for ${workload.id}-${jobGroup} run ${run.id}`, deploy);
            return deploy;
          };

          const deploy = await this.datastore.findOrInsertOneDated<DailyTotalDeploy>(
            COLLECTION_NAME_DEPLOY_BOUNDS,
            current,
            fields,
            populator,
          );
          currentDayJobGroup.total += deploy.leadTime;
          currentDayJobGroup.count++;
          currentDayJobGroup.deploys.push(deploy);
        } catch (e) {
          warn(`Failed to calculate lead time for ${workload.id}-${jobGroup} run ${run.id}: ${e}`);
        }
      }

      currentDay.set(jobGroup, currentDayJobGroup);
      dailyTotals.set(current, currentDay);
    }
  };
}

export const getDeploymentPipelineProvider = (workloadId: WorkloadId, stage: StageConfig): PipelinesService => {
  return getPipelines(workloadId, stage.id);
};
