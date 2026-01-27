import { Run, RunWithMetadata } from "../../model/runs";
import { logger, verbose } from "../../utils/logger/logger";
import {
  getAllPipelinesConfig,
  getServerConfig,
  getWorkloadById,
} from "../../config/configMapping";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { getDeploymentService } from "../deployment/deploymentService";
import { StageConfig } from "../../model/config/pipeline-config";
import { PipelinesTypes } from "../../model/config/common";
import { getConfigItemAsBoolean } from "../../config/sources/source";
import { lookupJobGroupForJobName } from "../../utils/jobs";
import { Datastore, DatastoreCollection, QueryFilter } from "../../db/api";
import { provideDatastore } from "../../db/factory";

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

export type PipelinesServiceJobNameFilter = {
  jobGroup?: string | null;
  repoName?: string | null;
};

export type PipelinesService = {
  /**
   * Get the list of runs for specific job names.
   * @param workloadId
   * @param jobNames
   * @param branches
   * @param startDate
   * @param endDate
   */
  getRunsForJobs(
    workloadId: WorkloadId,
    jobNames: string[],
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


  /**
   * Discover job names for a workload, optionally filtered by job group and/or repo name.
   * @param workload
   * @param filter
   */
  discoverJobNames(workload: Workload, filter: PipelinesServiceJobNameFilter): Promise<string[]>;

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

  async getRunsForJobs(
    workloadId: WorkloadId,
    jobNames: string[],
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<RunWithMetadata[]> {
    const runs = await this.getRunsForProject(
      workloadId,
      jobNames,
      this.stage.projectName,
      branches,
      startDate,
      endDate,
    );
    logger(`Found ${runs.length} pipeline runs for ${workloadId} jobs: ${jobNames.join(", ")}`);

    return runs.map((run) => {
      const jobGroup = lookupJobGroupForJobName(workloadId, run.job);
      return {
        run,
        workloadId,
        stageId: this.stage.id,
        jobGroup,
      };
    });
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

  abstract discoverJobNames(workload: Workload, filter: PipelinesServiceJobNameFilter): Promise<string[]>;

  abstract buildRunLink(workloadId: string, jobName: string, runId: string): string;
}

export class CachingPipelinesServiceImpl implements PipelinesService {
  private delegate: PipelinesService;
  private datastore: Datastore<QueryFilter, DatastoreCollection>;

  constructor(delegate: PipelinesService) {
    this.delegate = delegate;
    this.datastore = provideDatastore("pipelines-service-cache", { ttlIfToday: 3600 });
  }

  getRunsForJobs = (
    workloadId: WorkloadId,
    jobNames: string[],
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<RunWithMetadata[]> => {
    return this.delegate.getRunsForJobs(workloadId, jobNames, branches, startDate, endDate);
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

  discoverJobNames = (workload: Workload, filter: PipelinesServiceJobNameFilter): Promise<string[]> => {
    return this.datastore.findOrInsertOne("pipelines-job-names", { ...filter, workloadId: workload.id }, () => {
      return this.delegate.discoverJobNames(workload, filter);
    });
  };

  buildRunLink = (workloadId: string, jobName: string, runId: string): string =>
    this.delegate.buildRunLink(workloadId, jobName, runId);
}
