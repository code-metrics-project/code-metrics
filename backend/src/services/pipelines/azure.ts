import * as azdev from "azure-devops-node-api";
import {getRelativeDate, MILLIS_PER_DAY, truncateDateOnly} from "../../utils/date";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { Run, RunList, RunResult, RunWithMetadata } from "../../model/runs";
import { Build, BuildResult as ADOBuildResult } from "azure-devops-node-api/interfaces/BuildInterfaces";
import { IBuildApi } from "azure-devops-node-api/BuildApi";
import { provideDatastore } from "../../db/factory";
import { getAllIssueManagementUrls, getAllPipelinesConfig, getWorkloadById } from "../../config/configMapping";
import { Datastore, DatastoreCollection, QueryFilter } from "../../db/api";
import { AbstractPipelinesService, registerPipelines } from "./pipelinesService";
import { matchOrEquals } from "../../utils/matchers";
import { jsonPathQuery } from "../../utils/json";
import { listNormalisedJobGroupsForWorkload, lookupJobGroupForJobName } from "../../utils/jobs";
import { Workload, WorkloadId } from "../../model/config/workload-config";

import { StageConfig } from "../../model/config/pipeline-config";
import {mapJobNamesUsingStageConfig, mapJobNameUsingStageConfig} from "./common";
import {StorableLike} from "../dateWalker";
import {PipelinesTypes} from "../../model/config/common";

const COLLECTION_NAME_PIPELINE_RUNS = "pipeline-executions";

type AzureCacheItemFilter = StorableLike & {
  stageId: string;
  workloadId: string;
  vcsProjectName: string;
};

type PopulatedItem = RunList & AzureCacheItemFilter;

export const initAdoPipelines = () => registerPipelines(PipelinesTypes.AZURE, (stage) => new AdoPipelinesService(stage));

class AdoPipelinesService extends AbstractPipelinesService {
  private connections: Map<string, azdev.WebApi>;
  private datastore: Datastore<QueryFilter, DatastoreCollection>;

  constructor(stage: StageConfig) {
    super(stage);
    this.datastore = provideDatastore("ado-pipelines", { ttlIfToday: 3600 });
    this.connections = new Map<string, azdev.WebApi>();
  }

  getConnection = (workloadId: WorkloadId, reset = false): azdev.WebApi => {
    const connectionId = `${workloadId}/${this.stage.id}`;
    let connection: azdev.WebApi;
    if (!this.connections.has(connectionId) || reset) {
      const remoteServerId = this.stage.serverId;
      const azureServer = getAllPipelinesConfig().azure.servers.find((server) => server.id === remoteServerId);

      const authHandler = azdev.getPersonalAccessTokenHandler(azureServer.apiKey);
      connection = new azdev.WebApi(azureServer.url, authHandler);
      this.connections.set(connectionId, connection);
    } else {
      connection = this.connections.get(connectionId);
    }

    return connection;
  };

  getRunsForProject = async (
    workloadId: string,
    jobNames: string[],
    vcsProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Run[]> => {
    const runs = [];

    const buildApi = await this.getConnection(workloadId).getBuildApi();

    // days between earliest and latest date
    const days = Math.round((endDate.getTime() - startDate.getTime()) / MILLIS_PER_DAY);
    logger(`${days} days between ${startDate.toISOString()} and ${endDate.toISOString()}`);

    // this is a work-around to query by day, as azure-devops-node-api imposes a hard limit
    // of 1000 results and doesn't (currently) expose pagination/continuationToken support.
    for (let i = 0; i <= days; i++) {
      const current = getRelativeDate(startDate, i);
      const projectBuilds = await this.getRunsForProjectForDay(
        buildApi,
        workloadId,
        jobNames,
        vcsProjectName,
        branches,
        current,
      );
      runs.push(...projectBuilds.builds);
    }

    return runs;
  };

  /**
   * Wraps call to `fetchRunsForProjectForDay()` with DB cache.
   * @param buildApi
   * @param workloadId
   * @param rawJobNames
   * @param vcsProjectName
   * @param branches
   * @param date in format `yyyy-mm-dd`
   */
  getRunsForProjectForDay = async (
    buildApi: IBuildApi,
    workloadId: string,
    rawJobNames: string[],
    vcsProjectName: string,
    branches: string[],
    date: Date,
  ): Promise<RunList> => {
    const workload = getWorkloadById(workloadId);

    // map job names using stage config
    const jobNames = mapJobNamesUsingStageConfig(workload, rawJobNames, this.stage.id);

    const populator = async (): Promise<PopulatedItem> => {
      const runs = await this.fetchRunsForProjectForDay(buildApi, workloadId, vcsProjectName, date);
      return {
        stageId: this.stage.id,
        ...runs,
      };
    };

    const fields: AzureCacheItemFilter = { stageId: this.stage.id, workloadId, vcsProjectName, date: truncateDateOnly(date) };
    const runs = await this.datastore.findOrInsertOneDated<RunList>(
      COLLECTION_NAME_PIPELINE_RUNS,
      date,
      fields,
      populator,
    );
    // filter repos for this specific query
    runs.builds = runs.builds.filter((build) =>
      jobNames.some((jobName) => matchOrEquals(jobName, build.job)),
    );
    if (branches.length) {
      runs.builds = runs.builds.filter((build) =>
        branches.includes(build.branch.replace("refs/heads/", "")),
      );
    }
    return runs;
  };

  /**
   * Invoke the ADO API to list the builds for the given project on a given date.
   * @param buildApi
   * @param workloadId
   * @param vcsProjectName
   * @param date in format `yyyy-mm-dd`
   */
  fetchRunsForProjectForDay = async (
    buildApi: IBuildApi,
    workloadId: string,
    vcsProjectName: string,
    date: Date,
  ): Promise<RunList> => {
    verbose(`Getting pipeline runs for ${vcsProjectName} on ${date}`);

    const endDate = getRelativeDate(date, 1);

    const rawBuilds = await buildApi.getBuilds(vcsProjectName, null, null, null, date, endDate);
    logger(`Retrieved ${rawBuilds.length} builds for ${vcsProjectName} on ${date}`);

    const runs: Run[] = rawBuilds
      .filter((build) => {
        // exclude builds that complete within the given range but start before it
        return build.startTime >= date;
      })
      .map((build) => {
        const jobName = build.repository.name;
        return this.convertBuildToRun(build, jobName);
      });

    return { workloadId, vcsProjectName, date: truncateDateOnly(date), builds: runs };
  };

  getRunById = async (workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null> => {
    const build = await this.getRawPipelineBuild(workloadId, jobName, jobName, runId);
    if (!build) {
      warn(`Could not find build with ID: ${runId}`);
      return null;
    }
    const jobGroup = lookupJobGroupForJobName(workloadId, jobName);
    return {
      workloadId,
      stageId: this.stage.id,
      jobGroup,
      run: this.convertBuildToRun(build, jobName),
    };
  }

  getPipelineRunProperty = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null> => {
    logger(`Fetching property ${propertyJsonPath} for azure build ${runId} of job ${jobName} in project ${vcsProjectName}`);
    const build = await this.getRawPipelineBuild(workloadId, vcsProjectName, jobName, runId);

    const propertyValue = jsonPathQuery(build, propertyJsonPath);
    verbose(`Fetched property ${propertyJsonPath} for azure build ${runId} of job ${jobName} in project ${vcsProjectName}`, propertyValue);
    return propertyValue?.toString();
  };

  private getRawPipelineBuild = async (workloadId: string, vcsProjectName: string, jobName: string, runId: string) => {
    const workload = getWorkloadById(workloadId);
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    verbose(`Fetching azure build ${jobName} ${runId} in project ${vcsProjectName}`);
    const buildApi = await this.getConnection(workloadId).getBuildApi();
    const build = await buildApi.getBuild(vcsProjectName, parseInt(runId));
    return build;
  };

  private convertBuildToRun(build: Build, jobName: string): Run {
    let result: RunResult;
    switch (build.result) {
      case ADOBuildResult.Succeeded:
        result = RunResult.Succeeded;
        break;

      case ADOBuildResult.Failed:
      case ADOBuildResult.PartiallySucceeded:
        result = RunResult.Failed;
        break;

      case ADOBuildResult.Canceled:
        result = RunResult.Aborted;
        break;

      default:
        warn(`Unsupported build result: ${build.result} for build ${build.id}`);
        break;
    }

    const duration = Math.round((build.finishTime.getTime() - build.startTime.getTime()) / 1000);
    return {
      id: build.id?.toString(),
      job: jobName,
      repo: build.repository.name,
      branch: build.sourceBranch,
      startDate: build.startTime?.toISOString(),
      duration,
      result,
    };
  }

  discoverJobNames = async (workload: Workload, jobGroup: string): Promise<string[]> => {
    const jobGroups = listNormalisedJobGroupsForWorkload(workload);

    // TODO discover via API and filter as jobName can be a regex
    return jobGroups[jobGroup]?.jobNames ?? [];
  }

  buildRunLink = (workloadId: string, jobName: string, runId: string): string => {
    const server = getAllPipelinesConfig().azure.servers.find((server) => server.id === this.stage.serverId);
    return `${server.url}/${this.stage.projectName}/_builds/${runId}`;
  }
}
