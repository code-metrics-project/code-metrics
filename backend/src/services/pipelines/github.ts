import {Octokit} from "@octokit/rest";
import {AbstractPipelinesService, registerPipelines} from "./pipelinesService";
import {ActorType, Run, RunResult, RunWithMetadata} from "../../model/runs";
import {getAllPipelinesConfig, getWorkloadById} from "../../config/configMapping";
import {logger, verbose, warn} from "../../utils/logger/logger";
import {truncateDateOnly} from "../../utils/date";
import {provideDatastore} from "../../db/factory";
import {getDataForDateRange, StorableLike} from "../dateWalker";
import {jsonPathQuery} from "../../utils/json";
import {listNormalisedJobGroupsForWorkload, lookupJobGroupForJobName} from "../../utils/jobs";
import {Workload, WorkloadId} from "../../model/config/workload-config";

import {StageConfig} from "../../model/config/pipeline-config";
import {mapJobNameUsingStageConfig} from "./common";
import {PipelinesTypes} from "../../model/config/common";

const COLLECTION_NAME_PIPELINE_RUNS = "pipeline-executions";
const EXPIRY_SECONDS: number = process.env.EXPIRY_SECONDS ? parseInt(process.env.EXPIRY_SECONDS) : 3600;

type GithubCacheItemFilter = {
  stageId: string;
  projectName: string;
  jobName: string;
  branch: string;
};

type PopulatedItem = StorableLike & GithubCacheItemFilter & { builds: Run[] };

type WorkflowRunConclusion = "completed" | "action_required" | "cancelled" | "failure" | "startup_failure" | "neutral" | "skipped" | "stale" | "success" | "timed_out" | "in_progress" | "queued" | "requested" | "waiting"

type WorkflowRun = {
  id: number;
  name: string;
  head_branch: string;
  run_started_at: string;
  updated_at: string;
  status: string;
  conclusion: WorkflowRunConclusion;
  repository: { name: string };
  actor: {
    login: string,
    type: string
  };
};

type WorkflowRunResponse = { data: WorkflowRun };

export const initGithubPipelines = () => registerPipelines(PipelinesTypes.GITHUB, (stage) => new GithubPipelinesService(stage));

class GithubPipelinesService extends AbstractPipelinesService {
  constructor(stage: StageConfig) {
    super(stage);
  }

  private datastore = provideDatastore("github-pipelines", { ttlIfToday: EXPIRY_SECONDS });
  private connections = new Map<WorkloadId, Octokit>();

  getConnection(workloadId: WorkloadId) {
    const connectionId = `${workloadId}/${this.stage.id}`;
    let connection = this.connections.get(connectionId);
    if (!connection) {
      const serverId = this.stage.serverId;
      const server = getAllPipelinesConfig().github.servers.find((server) => server.id === serverId);
      if (!server) {
        throw new Error(`No GitHub server configuration found named: ${serverId}`);
      }
      connection = new Octokit({
        auth: server.apiKey,
        baseUrl: server.url,
      });
      this.connections.set(connectionId, connection);
    }
    return connection;
  }

  async getRunsForProject(
    workloadId: string,
    jobNames: string[],
    vcsProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Run[]> {
    const workload = getWorkloadById(workloadId);

    const connection = this.getConnection(workloadId);
    const allRuns: Run[] = [];

    for (const jobName of jobNames) {
      for (const branch of branches) {
        const populator = async (current: Date): Promise<PopulatedItem> => {
          const builds = await this.getRunsForRepo(workload, current, current, connection, vcsProjectName, jobName, [
            branch,
          ]);
          return {
            date: truncateDateOnly(current),
            stageId: this.stage.id,
            branch,
            jobName,
            projectName: vcsProjectName,
            builds,
          };
        };

        const fields: GithubCacheItemFilter = { stageId: this.stage.id, projectName: vcsProjectName, jobName: jobName, branch };
        const runs: PopulatedItem[] = await getDataForDateRange(
          COLLECTION_NAME_PIPELINE_RUNS,
          fields,
          startDate,
          endDate,
          this.datastore,
          populator,
        );
        allRuns.push(...runs.flatMap((r) => r.builds));
      }
    }
    return allRuns;
  }

  private async getRunsForRepo(
    workload: Workload,
    startDate: Date,
    endDate: Date,
    connection: Octokit,
    vcsProjectName: string,
    jobName: string,
    branches: string[],
  ): Promise<Run[]> {
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    // search syntax per https://docs.github.com/en/search-github/getting-started-with-searching-on-github/understanding-the-search-syntax#query-for-dates
    const createRange =
        startDate === endDate
            ? truncateDateOnly(startDate)
            : `${truncateDateOnly(startDate)}..${truncateDateOnly(endDate)}`;

    const resp = await connection.paginate(connection.actions.listWorkflowRunsForRepo, {
      owner: vcsProjectName,
      repo: jobName,
      per_page: 100,
      created: createRange,

      // only fetch completed runs
      status: "completed",
    });

    const raw = resp as WorkflowRun[];
    logger(`Retrieved ${raw.length} runs for github repo: ${vcsProjectName}/${jobName} with supported statuses`)

    let runs: Run[] = [];
    for (const run of raw) {
      if (run.status === "completed") {
        runs.push(this.convertWorkflowRunToRun(run, jobName));
      }
    }
    if (branches.length) {
      runs = runs.filter((runs) => branches.includes(runs.branch.replace("refs/heads/", "")));
    }
    return runs;
  }

  async getRunById(workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null> {
    const run = await this.getRawPipelineRun(workloadId, this.stage.projectName, jobName, runId);
    if (!run) {
      warn(`Could not find run with ID: ${runId}`);
      return null;
    }
    const jobGroup = lookupJobGroupForJobName(workloadId, jobName);
    return {
      workloadId,
      stageId: this.stage.id,
      jobGroup,
      run: this.convertWorkflowRunToRun(run.data, jobName),
    };
  }

  async getPipelineRunProperty(
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null> {
    logger(`Fetching property ${propertyJsonPath} for github run ${runId} of job ${jobName} in project ${vcsProjectName}`);
    const run = await this.getRawPipelineRun(workloadId, vcsProjectName, jobName, runId);

    const propertyValue = jsonPathQuery(run, propertyJsonPath);
    verbose(`Fetched property ${propertyJsonPath} for github run ${runId} of job ${jobName} in project ${vcsProjectName}`, propertyValue);
    return propertyValue?.toString();
  }

  buildRunLink = (workloadId: string, jobName: string, runId: string): string => {
    const server = getAllPipelinesConfig().github.servers.find((server) => server.id === this.stage.serverId);
    return `${server.url?.length ? server.url : "https://github.com"}/${this.stage.projectName}/${jobName}/actions/runs/${runId}`;
  }

  private getRawPipelineRun = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
  ): Promise<WorkflowRunResponse | null> => {
    const workload = getWorkloadById(workloadId);
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    verbose(`Fetching github run ${runId} of job ${jobName} in project ${vcsProjectName}`);
    const connection = this.getConnection(workloadId);

    // see API: https://docs.github.com/en/rest/actions/workflow-runs?apiVersion=2022-11-28
    let run = await connection.actions.getWorkflowRun({
      owner: vcsProjectName,
      repo: jobName,
      run_id: parseInt(runId),
    });

    // work-around to reify the object so we can query it with jsonpath
    run = JSON.parse(JSON.stringify(run));
    return run as unknown as WorkflowRunResponse;
  }

  private convertWorkflowRunToRun = (run: WorkflowRun, jobName: string): Run => {
    const duration = run.updated_at ? (new Date(run.updated_at).getTime() - new Date(run.run_started_at).getTime()) / 1000 : 0;
    return {
      id: run.id.toString(),
      job: jobName ?? run.name,
      branch: run.head_branch,
      startDate: run.run_started_at,
      result: convertConclusionToResult(run.conclusion),
      repo: run.repository.name,
      duration,
      user: run.actor.login,
      userType: ActorType[run.actor.type],
    };
  }

  discoverJobNames = async (workload: Workload, jobGroup: string): Promise<string[]> => {
    const jobGroups = listNormalisedJobGroupsForWorkload(workload);

    // TODO discover via API and filter as jobName can be a regex
    return jobGroups[jobGroup]?.jobNames ?? [];
  }
}

const convertConclusionToResult = (conclusion: WorkflowRunConclusion): RunResult => {
  switch (conclusion) {
    case "success":
    case "completed":
      return RunResult.Succeeded;
    case "failure":
    case "startup_failure":
    case "timed_out":
      return RunResult.Failed;
    case "cancelled":
      return RunResult.Aborted;
    case "skipped":
      verbose(`ignoring build result: ${conclusion}`);
      return null;
    default:
      console.warn(`Unsupported build result: ${conclusion}`);
      return null;
  }
};
