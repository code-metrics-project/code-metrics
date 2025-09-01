import { Run, RunWithMetadata } from "../../model/runs";
import { logger, verbose } from "../../utils/logger/logger";
import {
  determineJobGroups,
  determineJobNames,
  getAllPipelinesConfig,
  getServerConfig,
  getWorkloadById,
} from "../../config/configMapping";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { getDeploymentService } from "../deployment/deploymentService";
import { StageConfig } from "../../model/config/pipeline-config";
import { PipelinesTypes } from "../../model/config/common";
import { getConfigItemAsBoolean } from "../../config/sources/source";

const CACHE_PIPELINE_BUILDS = getConfigItemAsBoolean("CACHE_PIPELINE_BUILDS", true);

const builders: Record<string, (stage: StageConfig) => PipelinesService> = {};
const instances: Record<string, PipelinesService> = {};

export const registerPipelines = (type: PipelinesTypes, builder: (stage: StageConfig) => PipelinesService) => {
  verbose(`Registered pipeline implementation for: ${type}`);
  builders[type] = builder;
};

export const getPipelinesForWorkload = (workload: Workload, stageId: string): PipelinesService =>
  getPipelines(workload, stageId);

export const getPipelines = (workload: Workload | WorkloadId, stageId: string): PipelinesService => {
  if (typeof workload === "string") {
    workload = getWorkloadById(workload);
  }
  const deploymentService = getDeploymentService();
  const stage = deploymentService.getStageConfigForWorkload(workload, stageId);

  const instanceKey = `${workload.id}/${stage.id}`;
  let instance = instances[instanceKey];
  if (!instance) {
    const builder = builders[stage.type];
    if (!builder) {
      throw new Error(`No pipeline implementation registered for type: ${stage.type}`);
    }
    instance = builder(stage);
    if (CACHE_PIPELINE_BUILDS) {
      instance = new CachingPipelinesServiceImpl(instance);
    }
    instances[instanceKey] = instance;
  }
  return instance;
};

export type PipelinesService = {
  /**
   * Get the list of runs for a workload's job groups.
   * @param workloadId
   * @param jobGroups
   * @param branches
   * @param startDate
   * @param endDate
   */
  getRunsForJobGroups(
    workloadId: WorkloadId,
    jobGroups: string[],
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<RunWithMetadata[]>;

  /**
   * Get the list of runs for a workload's project.
   * @param workloadId
   * @param jobGroups
   * @param pipelinesProjectName
   * @param branches
   * @param startDate
   * @param endDate
   */
  getRunsForProject(
    workloadId: WorkloadId,
    jobGroups: string[],
    pipelinesProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Run[]>;

  discoverJobNames(workload: Workload, jobGroup: string): Promise<string[]>;

  /**
   * Get the list of branches for a workload.
   * @param workloadId
   */
  getBranchesForWorkload(workloadId: string): Promise<string[]>;

  /**
   * Get a pipeline run by ID.
   * @param workloadId
   * @param jobName
   * @param runId
   */
  getRunById(workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null>;

  /**
   * Get the value of a property for a pipeline run.
   * @param workloadId
   * @param vcsProjectName
   * @param jobName
   * @param runId
   * @param propertyJsonPath
   */
  getPipelineRunProperty(
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null>;

  /**
   * Build a link to a pipeline run.
   * @param workloadId
   * @param jobName
   * @param runId
   */
  buildRunLink(workloadId: string, jobName: string, runId: string): string;
};

export abstract class AbstractPipelinesService implements PipelinesService {
  protected stage: StageConfig;

  constructor(stage: StageConfig) {
    this.stage = stage;
  }

  async getRunsForJobGroups(
    workloadId: WorkloadId,
    jobGroups: string[],
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<RunWithMetadata[]> {
    const workload = getWorkloadById(workloadId);
    const allRuns: RunWithMetadata[] = [];

    const jGroups = determineJobGroups(workload, jobGroups);

    for (const jobGroup of jGroups) {
      const jobNames = await determineJobNames(workload, jobGroup);
      const groupRuns = await this.getRunsForProject(
        workloadId,
        jobNames,
        this.stage.projectName,
        branches,
        startDate,
        endDate,
      );
      logger(`Found ${groupRuns.length} pipeline runs for ${workloadId}-${jobGroup}`);

      allRuns.push(
        ...groupRuns.map((run) => {
          return {
            run,
            workloadId,
            stageId: this.stage.id,
            jobGroup,
          };
        }),
      );
    }

    return allRuns;
  }

  abstract getRunsForProject(
    workloadId: WorkloadId,
    jobGroups: string[],
    pipelinesProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Run[]>;

  abstract getRunById(workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null>;

  async getBranchesForWorkload(workloadId: string): Promise<string[]> {
    const server = getServerConfig(getAllPipelinesConfig()[this.stage.type].servers, this.stage.serverId);
    return server.branches ?? [];
  }

  abstract getPipelineRunProperty(
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null>;

  abstract discoverJobNames(workload: Workload, jobGroup: string): Promise<string[]>;

  abstract buildRunLink(workloadId: string, jobName: string, runId: string): string;
}

export class CachingPipelinesServiceImpl implements PipelinesService {
  private delegate: PipelinesService;

  constructor(delegate: PipelinesService) {
    this.delegate = delegate;
  }

  getRunsForJobGroups = (
    workloadId: WorkloadId,
    jobGroups: string[],
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<RunWithMetadata[]> => {
    return this.delegate.getRunsForJobGroups(workloadId, jobGroups, branches, startDate, endDate);
  };

  getRunsForProject = (
    workloadId: string,
    jobGroups: string[],
    pipelinesProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Run[]> =>
    this.delegate.getRunsForProject(workloadId, jobGroups, pipelinesProjectName, branches, startDate, endDate);

  getRunById = (workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null> =>
    this.delegate.getRunById(workloadId, jobName, runId);

  getBranchesForWorkload = (workloadId: string): Promise<string[]> => this.delegate.getBranchesForWorkload(workloadId);

  getPipelineRunProperty = (
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null> =>
    this.delegate.getPipelineRunProperty(workloadId, vcsProjectName, jobName, runId, propertyJsonPath);

  discoverJobNames = (workload: Workload, jobGroup: string): Promise<string[]> =>
    this.delegate.discoverJobNames(workload, jobGroup);

  buildRunLink = (workloadId: string, jobName: string, runId: string): string =>
    this.delegate.buildRunLink(workloadId, jobName, runId);
}
