import Jenkins from "jenkins";
import { Run, RunResult, RunWithMetadata } from "../../model/runs";
import { getAllPipelinesConfig, getAllRemoteConfig, getWorkloadById } from "../../config/configMapping";
import { AbstractPipelinesService, PipelinesServiceJobNameFilter, registerPipelines } from "./pipelinesService";
import { matchOrEquals } from "../../utils/matchers";
import { listNormalisedJobGroupsForWorkload, lookupJobGroupForJobName, resolveJobGroupPatterns } from "../../utils/jobs";
import { Workload, WorkloadId } from "../../model/config/workload-config";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { jsonPathQuery } from "../../utils/json";
import { StageConfig } from "../../model/config/pipeline-config";
import { mapJobNamesUsingStageConfig, mapJobNameUsingStageConfig } from "./common";
import { PipelinesTypes } from "../../model/config/common";

const JENKINS_BRANCH_PARAMETER = "BRANCH_NAME";

enum EJenkinsActionClass {
  Parameters = "hudson.model.ParametersAction",
}

enum EJenkinsJobClass {
  Folder = "com.cloudbees.hudson.plugins.folder.Folder",
  Workflow = "org.jenkinsci.plugins.workflow.job.WorkflowJob",
  Multibranch = "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject",
}

type TJenkinsJob = {
  _class: EJenkinsJobClass;
  builds?: {
    actions: {
      _class: EJenkinsActionClass;
      parameters: {
        name: string;
        value: string;
      }[];
    }[];
  }[];
  displayName: string;
  fullName: string;
  jobs?: TJenkinsJob[];
};

type TJenkinsBuildResult = "SUCCESS" | "FAILURE" | "NOT_BUILT" | "UNSTABLE" | "ABORTED";

type TJenkinsBuild = {
  id;
  result: TJenkinsBuildResult;
  inProgress: boolean;
  timestamp;
  actions: {
    _class: EJenkinsActionClass;
    parameters: {
      name;
      value;
    }[];
  }[];
  duration: number;
};

export const initJenkinsPipelines = () =>
  registerPipelines(PipelinesTypes.JENKINS, (config) => new JenkinsPipelinesService(config));

class JenkinsPipelinesService extends AbstractPipelinesService {
  private connections: Map<string, Jenkins>;

  constructor(stage: StageConfig) {
    super(stage);
    this.connections = new Map<string, Jenkins>();
  }

  getConnection = (workloadId: WorkloadId, reset = false): Jenkins => {
    const connectionId = `${workloadId}/${this.stage.id}`;
    let connection: Jenkins;
    if (!this.connections.has(connectionId) || reset) {
      const remoteServerId = this.stage.serverId;
      const jenkinsServer = getAllRemoteConfig().pipelines.jenkins.servers.find(
        (server) => server.id === remoteServerId,
      );

      connection = new Jenkins({
        baseUrl: jenkinsServer.url,
      });
      this.connections.set(connectionId, connection);
    } else {
      connection = this.connections.get(connectionId);
    }

    return connection;
  };

  getRunsForProject = async (
    workloadId: string,
    rawJobNames: string[],
    pipelinesProjectName: string,
    branches: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<Run[]> => {
    const workload = getWorkloadById(workloadId);

    // map job names using stage config
    const jobNames = mapJobNamesUsingStageConfig(workload, rawJobNames, this.stage.id);

    const buildApi = this.getConnection(workloadId);
    const rootLevelItems: TJenkinsJob[] = await buildApi.job.list({ depth: 3 } as any);
    const jobs = extractJobs(rootLevelItems);
    const matchingJobs = jobs.filter((job) => jobNames.some((jobName) => matchOrEquals(jobName, job.displayName)));

    if (!matchingJobs.length) return [];

    const multiBranchJobs = matchingJobs
      .filter((job) => job._class === EJenkinsJobClass.Multibranch)
      .map((mbJob) => {
        if (!branches?.length) return mbJob.jobs;
        return mbJob.jobs.filter((job) => {
          return !!branches.find((branch) => branch.match(job.displayName)?.length);
        });
      })
      .flat();
    const multibranchRuns = (
      await Promise.all(
        multiBranchJobs.map(async (job) =>
          getRunsForJob(workloadId, this.stage, buildApi, job.fullName, startDate, endDate),
        ),
      )
    ).flat();

    const otherJobs = matchingJobs.filter((job) => job._class !== EJenkinsJobClass.Multibranch);
    const otherRuns = (
      await Promise.all(
        otherJobs.map(async (job) =>
          getRunsForJob(workloadId, this.stage, buildApi, job.fullName, startDate, endDate, branches),
        ),
      )
    ).flat();

    return [...multibranchRuns, ...otherRuns];
  };

  async getRunById(workloadId: WorkloadId, jobName: string, runId: string): Promise<RunWithMetadata | null> {
    const connection = this.getConnection(workloadId);
    const workload = getWorkloadById(workloadId);
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    const build = await getRawJobBuild(connection, jobName, runId);
    if (!build) {
      logger(`Could not find build with ID: ${runId}`);
      return null;
    }
    const jobGroup = lookupJobGroupForJobName(workloadId, jobName);
    return {
      workloadId,
      stageId: this.stage.id,
      jobGroup,
      run: convertBuildToRun(build, jobName),
    };
  }

  getPipelineRunProperty = async (
    workloadId: WorkloadId,
    vcsProjectName: string,
    jobName: string,
    runId: string,
    propertyJsonPath: string,
  ): Promise<string | null> => {
    const workload = getWorkloadById(workloadId);
    jobName = mapJobNameUsingStageConfig(workload, jobName, this.stage.id);

    logger(`Fetching property ${propertyJsonPath} for jenkins build ${runId} of job ${jobName}`);
    const connection = this.getConnection(workloadId);
    const build = await getRawJobBuild(connection, jobName, runId);

    const propertyValue = jsonPathQuery(build, propertyJsonPath);
    verbose(`Fetched property ${propertyJsonPath} for jenkins build ${runId} of job ${jobName}`, propertyValue);
    return propertyValue?.toString();
  };

  discoverJobNames = async (workload: Workload, filter: PipelinesServiceJobNameFilter): Promise<string[]> => {
    const jobGroups = listNormalisedJobGroupsForWorkload(workload);

    // TODO discover via API and filter using 'filterJobsByJobGroup' as jobName can be a regex

    const groups = filter.jobGroup ? [jobGroups[filter.jobGroup]].filter(Boolean) : Object.values(jobGroups);
    return groups.flatMap((group) => resolveJobGroupPatterns(group, workload).includePatterns);
  };

  buildRunLink = (workloadId: string, jobName: string, runId: string): string => {
    const server = getAllPipelinesConfig().jenkins.servers.find((server) => server.id === this.stage.serverId);
    return `${server.url}/${this.stage.projectName}/jobs/${jobName}/builds/${runId}`;
  };
}

function extractJobs(jobs: TJenkinsJob[]): TJenkinsJob[] {
  const pipelineJobs = jobs.map((job) => {
    switch (job._class) {
      case EJenkinsJobClass.Folder:
        if (!job?.jobs) return null;
        return extractJobs(job?.jobs);
      case EJenkinsJobClass.Workflow:
      case EJenkinsJobClass.Multibranch:
        return job;
      default:
        throw new Error(`Unable to handle job type ${job._class}`);
    }
  });

  return pipelineJobs.filter((_) => !!_).flat();
}

function convertBuildToRun(buildInfo: TJenkinsBuild, jobName: string, branchName?): Run {
  // duration is returned in millis
  const duration = Math.round(buildInfo.duration / 1000);

  return {
    id: buildInfo.id,
    job: jobName,
    repo: "", // TODO: Seems this would have to come from http://[jenkins server]/job/[job]/config.xml
    branch: branchName || jobName,
    startDate: buildInfo.timestamp,
    result: mapBuildResult(buildInfo.result),
    duration,
  };
}

async function getRunsForJob(
  workloadId: WorkloadId,
  stage: StageConfig,
  connection: Jenkins,
  jobName: string,
  startDate: Date,
  endDate: Date,
  branches?: string[],
) {
  const workload = getWorkloadById(workloadId);
  jobName = mapJobNameUsingStageConfig(workload, jobName, stage.id);

  const jobInfo = await connection.job.get(jobName);
  const firstBuildNumber = jobInfo.firstBuild.number;
  const lastBuildNumber = jobInfo.lastBuild.number;

  const runs: Run[] = [];
  for (let i = firstBuildNumber; i <= lastBuildNumber; i++) {
    const buildInfo: TJenkinsBuild = await getRawJobBuild(connection, jobName, i);

    if (buildInfo.timestamp < startDate.getTime() || buildInfo.timestamp > endDate.getTime() || buildInfo.inProgress)
      continue;

    let branchName;
    if (branches?.length) {
      const actions = buildInfo.actions;
      const parameterActions = actions.filter((action) => action._class === EJenkinsActionClass.Parameters);
      const branchParameter = parameterActions
        .map((parameterAction) => parameterAction.parameters)
        .flat()
        .find((action) => action.name === JENKINS_BRANCH_PARAMETER);
      if (!branchParameter) {
        warn(`Job ${jobName} build ${i} had no branch parameter.`);
        continue;
      }
      branchName = branches.find((branch) => branch.match(branchParameter.value)?.length);
      if (!branchName) continue;
    }

    runs.push(convertBuildToRun(buildInfo, jobName, branchName));
  }

  return runs;
}

/**
 * Fetches the raw build information for a given job and run ID.
 * @param connection
 * @param jobName - this must already be mapped (using mapJobNameUsingStageConfig)
 * @param runId
 */
async function getRawJobBuild(connection: Jenkins, jobName: string, runId: string): Promise<TJenkinsBuild | null> {
  return await connection.build.get(jobName, parseInt(runId));
}

function mapBuildResult(jenkinsBuildResult: TJenkinsBuildResult): RunResult {
  switch (jenkinsBuildResult) {
    case "SUCCESS":
      return RunResult.Succeeded;
    case "FAILURE":
    case "NOT_BUILT":
    case "UNSTABLE":
      return RunResult.Failed;
    case "ABORTED":
      return RunResult.Aborted;
    default:
      warn(`Unsupported build result: ${jenkinsBuildResult}`);
      break;
  }
}
