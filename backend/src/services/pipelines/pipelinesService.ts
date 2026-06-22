import { Run, RunWithMetadata } from "../../model/runs";
import { logger, verbose } from "../../utils/logger/logger";
import { getAllPipelinesConfig, getServerConfig, getWorkloadById } from "../../config/configMapping";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { getDeploymentService } from "../deployment/deploymentService";
import { StageConfig } from "../../model/config/pipeline-config";
import { PipelinesTypes } from "../../model/config/common";
import { getEnvConfigItemAsBoolean } from "../../config/sources/source";
import { lookupJobGroupForJobName } from "../../utils/jobs";
import { Datastore, DatastoreCollection, QueryFilter } from "../../db/api";
import { provideDatastore } from "../../db/factory";
import { ConnectionChecker, ConnectionCheckResult } from "../../model/remote-connection-status";
import { logger as loggerFn } from "../../utils/logger/logger";

const CACHE_PIPELINE_BUILDS = getEnvConfigItemAsBoolean("CACHE_PIPELINE_BUILDS", true);

const builders: Record<string, (stage: StageConfig) => PipelinesService> = {};
const instances: Record<string, PipelinesService> = {};
const checkers: Record<string, ConnectionChecker> = {};

export const registerPipelines = (type: PipelinesTypes, builder: (stage: StageConfig) => PipelinesService) => {
  verbose(`Registered pipeline implementation for: ${type}`);
  builders[type] = builder;
};

/**
 * Register a connection checker for a Pipelines provider type.
 * This allows checking connectivity to the remote server.
 */
export const registerPipelinesConnectionChecker = (type: PipelinesTypes, checker: ConnectionChecker) => {
  verbose(`Registered pipelines connection checker for: ${type}`);
  checkers[type] = checker;
};

/**
 * Check connectivity to all configured pipeline servers.
 * Returns connection status for each server (excludes 'none' type).
 */
export const checkPipelineConnections = async (): Promise<ConnectionCheckResult[]> => {
  const config = getAllPipelinesConfig();
  const results: ConnectionCheckResult[] = [];

  // Collect all servers from all pipeline types
  const checks: Promise<ConnectionCheckResult>[] = [];
  for (const [providerType, providerConfig] of Object.entries(config)) {
    if (!providerConfig?.servers) continue;
    if (providerType === PipelinesTypes.NONE) continue; // Skip noop implementations

    const checker = checkers[providerType];
    if (!checker) {
      // No checker registered for this type
      continue;
    }

    for (const server of providerConfig.servers) {
      checks.push(checker(server));
    }
  }

  // Run all checks in parallel
  const settled = await Promise.allSettled(checks);

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      // If a checker itself throws, log the error
      loggerFn(`Pipelines connection check failed with uncaught error: ${result.reason}`);
    }
  }

  return results;
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
