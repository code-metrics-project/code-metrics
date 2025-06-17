import { AbstractPipelinesService, registerPipelines } from "./pipelinesService";
import { getAllPipelinesConfig, getWorkloadById } from "../../config/configMapping";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { sameDay, truncateDateOnly } from "../../utils/date";
import {
  CodePipelineClient,
  GetPipelineExecutionCommand,
  GetPipelineExecutionOutput,
  paginateListPipelineExecutions,
  paginateListPipelines,
  PipelineExecution,
  PipelineExecutionStatus,
  PipelineExecutionSummary,
  PipelineSummary
} from "@aws-sdk/client-codepipeline";
import { matchOrEquals } from "../../utils/matchers";
import { Run, RunResult, RunWithMetadata } from "../../model/runs";
import { jsonPathQuery } from "../../utils/json";
import { listNormalisedJobGroupsForWorkload, lookupJobGroupForJobName } from "../../utils/jobs";
import { Workload, WorkloadId } from "../../model/config/workload-config";

import { StageConfig } from "../../model/config/pipeline-config";
import {mapJobNameUsingStageConfig} from "./common";
import {PipelinesTypes} from "../../model/config/common";

export const initCodePipelinePipelines = () => registerPipelines(PipelinesTypes.CODEPIPELINE, (stage) => new CodePipelinePipelinesService(stage));

class CodePipelinePipelinesService extends AbstractPipelinesService {
  private clients = new Map<WorkloadId, CodePipelineClient>();

  constructor(stage: StageConfig) {
    super(stage);
  }

  getClient(workloadId: WorkloadId) {
    const connectionId = `${workloadId}/${this.stage.id}`;
    let client = this.clients.get(connectionId);
    if (!client) {
      const serverId = this.stage.serverId;
      const server = getAllPipelinesConfig().codepipeline.servers.find((server) => server.id === serverId);
      if (!server) {
        throw new Error(`No CodePipeline server configuration found named: ${serverId}`);
      }
      const awsRegion = process.env.AWS_REGION;
      if (!awsRegion) {
        throw new Error(`No AWS_REGION environment variable set`);
      }
      client = new CodePipelineClient({
        region: awsRegion,

        /**
         * undefined/null uses the default endpoint.
         */
        endpoint: server.url,
      });
      this.clients.set(connectionId, client);
    }
    return client;
  }

  async getRunsForProject(
    workloadId: string,
    jobNames: string[],
    vcsProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Run[]> {
    const client = this.getClient(workloadId);
    const allRuns: Run[] = [];

    // branch filtering is not supported by the CodePipeline API
    if (branches.length > 0) {
      warn(`Branch filtering is not supported by the CodePipeline API, so all executions will be retrieved`);
    }

    for (const jobName of jobNames) {
        const builds = await this.getRunsForRepo(workloadId, startDate, endDate, client, vcsProjectName, jobName);
        allRuns.push(...builds);
    }
    return allRuns;
  }

  private async getRunsForRepo(
    workloadId: WorkloadId,
    startDate: Date,
    endDate: Date,
    client: CodePipelineClient,
    vcsProjectName: string,
    jobName: string,
  ): Promise<Run[]> {
    const workload = getWorkloadById(workloadId);
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    if (sameDay(startDate, endDate)) {
      // semantically this means 'until the end of the start date', per the dateWalker
      // see backend/src/services/dateWalker.ts
      endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000) - 1);
    }

    const paginator = paginateListPipelineExecutions({
      client,
      pageSize: 100,
    }, {
      pipelineName: jobName,
    });
    const raw: PipelineExecutionSummary[] = [];
    for await (const page of paginator) {
      raw.push(...page.pipelineExecutionSummaries);
    }
    verbose(`Retrieved ${raw.length} raw CodePipeline executions for: ${vcsProjectName}/${jobName}`);

    const runs: Run[] = raw
      .filter(notInProgress)
      .filter((execution) => {
        // we can't filter on startDate and endDate in the query (currently unsupported by AWS API),
        // so we have to filter the result list
        return execution.startTime >= startDate
          && execution.lastUpdateTime
          && execution.lastUpdateTime <= endDate;

      }).map((execution) => {
        return this.convertExecutionSummaryToRun(execution, jobName);
      });

    logger(`Retrieved ${runs.length} CodePipeline executions for: ${vcsProjectName}/${jobName} in time range with supported statuses`);
    return runs;
  }

  getRunById = async (workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null> => {
    const execution = await this.getRawPipelineExecution(workloadId, runId, jobName);
    if (!execution?.pipelineExecution) {
      warn(`Could not find execution with ID: ${runId}`);
      return null;
    }
    const jobGroup = lookupJobGroupForJobName(workloadId, jobName);
    return {
      workloadId,
      stageId: this.stage.id,
      jobGroup,
      run: this.convertExecutionToRun(execution.pipelineExecution, jobName),
    };
  };

  discoverJobNames = async (workload: Workload, jobGroup: string): Promise<string[]> => {
    const paginator = paginateListPipelines({
      client: this.getClient(workload.id),
      pageSize: 100,
    }, {});
    const raw: PipelineSummary[] = [];
    for await (const page of paginator) {
      raw.push(...page.pipelines);
    }
    verbose(`Retrieved ${raw.length} raw CodePipeline pipelines for: ${workload.id}`);

    const jobGroups = listNormalisedJobGroupsForWorkload(workload);
    const jobPatterns = jobGroups[jobGroup]?.jobNames ?? [];
    const jobNames = raw.filter((pipeline) => {
      return jobPatterns.some((jobPattern) => matchOrEquals(jobPattern, pipeline.name));
    }).map((pipeline) => {
      return pipeline.name;
    });
    logger(`Matched ${jobNames.length} CodePipeline pipelines for: ${workload.id}/${jobGroup}`);
    return jobNames;
  }

  async getPipelineRunProperty(
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null> {
    logger(`Fetching property ${propertyJsonPath} for CodePipeline execution ${runId} of job ${jobName}`);
    const execution = await this.getRawPipelineExecution(workloadId, runId, jobName);

    const propertyValue = jsonPathQuery(execution, propertyJsonPath);
    verbose(`Fetched property ${propertyJsonPath} for CodePipeline execution ${runId} of job ${jobName}`, propertyValue);
    return propertyValue?.toString();
  }

  buildRunLink = (workloadId: string, jobName: string, runId: string): string => {
    const server = getAllPipelinesConfig().codepipeline.servers.find((server) => server.id === this.stage.serverId);
    return `${server.url}/${this.stage.projectName}/_runs/${runId}`;
  }

  private getRawPipelineExecution = async (
    workloadId: string,
    runId: string,
    jobName: string,
  ): Promise<GetPipelineExecutionOutput | null> => {
    const workload = getWorkloadById(workloadId);
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    verbose(`Fetching CodePipeline execution ${runId} of job ${jobName}`);
    const client = this.getClient(workloadId);

    // see API: https://docs.aws.amazon.com/codepipeline/latest/APIReference/API_GetPipelineExecution.html
    const execution = await client.send(new GetPipelineExecutionCommand({
      pipelineExecutionId: runId,
      pipelineName: jobName,
    }));
    return execution;
  }

  private convertExecutionSummaryToRun(execution: PipelineExecutionSummary, jobName: string): Run {
    const duration = (execution.lastUpdateTime ? (execution.lastUpdateTime.getTime() - execution.startTime.getTime()) / 1000 : 0);

    // TODO parse execution.sourceRevisions?.[0]?.revisionUrl for repo and branch
    const repo = "";
    const branch = "";

    return {
      id: execution.pipelineExecutionId,
      job: jobName,
      repo,
      branch,
      startDate: truncateDateOnly(execution.startTime),
      result: convertResult(execution.status),
      duration,
    };
  }

  private convertExecutionToRun(execution: PipelineExecution, jobName: string): Run {
    // TODO parse execution.artifactRevisions?.[0]?.revisionUrl for repo and branch
    const repo = "";
    const branch = "";

    // PipelineExecution model does not have startTime or lastUpdateTime (unlike PipelineExecutionSummary).
    // See https://docs.aws.amazon.com/codepipeline/latest/APIReference/API_GetPipelineExecution.html
    const duration = 0;
    const startDate = "1970-01-01";

    return {
      id: execution.pipelineExecutionId,
      job: jobName,
      repo,
      branch,
      startDate,
      result: convertResult(execution.status),
      duration,
    };
  }
}

/**
 * Filter out executions that are in progress.
 * @param execution
 */
const notInProgress = (execution) =>
  execution.status !== PipelineExecutionStatus.InProgress
  && execution.status !== PipelineExecutionStatus.Stopping;

const convertResult = (result: PipelineExecutionStatus): RunResult => {
  switch (result) {
    case PipelineExecutionStatus.Succeeded:
      return RunResult.Succeeded;
    case PipelineExecutionStatus.Failed:
      return RunResult.Failed;
    case PipelineExecutionStatus.Cancelled:
    case PipelineExecutionStatus.Stopped:
    case PipelineExecutionStatus.Superseded:
      return RunResult.Aborted;
    default:
      console.warn(`Unsupported execution result: ${result}`);
      return null;
  }
};
