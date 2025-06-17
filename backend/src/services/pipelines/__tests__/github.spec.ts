/**
 * @group integration
 */

import { initGithubPipelines } from "../github";
import { getPipelinesForWorkload } from "../pipelinesService";
import { join } from "path";
import { loadConfig } from "../../../config/config";
import { PipelinesTypes, TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { RunResult } from "../../../model/runs";
import { initDatastore } from "../../../db/factory";
import { LogLevel, overrideLogLevel } from "../../../utils/logger/logger";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();
let mockServer;

const workload: Workload = {
  codeAnalysis: undefined, codeManagement: undefined,
  id: "athena",
  pipelines: {
    jobGroups: {
      "backend": {
        jobNames: ["octo-repo"],
      }
    },
    stages: [
      { stageId: "github-build-stage" },
    ],
  },
  projectManagement: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
  incidents: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
};

beforeAll(async () => {
  overrideLogLevel(LogLevel.Verbose);

  await initDatastore();
  initGithubPipelines();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/github"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {},
      pipelines: {
        github: {
          servers: [
            {
              id: "test-github",
              url: mockServer.baseUrl(),
              branches: ["main"],
              apiKey: process.env.GITHUB_TOKEN,
            },
          ],
        },
      },
      codeAnalysis: {},
      ticketManagement: {},
    },
    workloadConfig: {
      version: ConfigVersion.V2_0,
      workloads: [workload],
    },
    pipelineConfig: {
      stages: [{
        id: "github-build-stage",
        description: "build stage",
        type: PipelinesTypes.GITHUB,
        serverId: "test-github",
        projectName: "DeloitteDigitalUK",
        commitMapping: {
          runProperty: "$.data.head_sha",
        },
      }],
    },
  });
});
afterAll(async () => {
  await mockServer?.stop();
});

describe(`GitHub Pipelines integration`, () => {
  it(`lists builds for a project`, async () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");

    const startDate = new Date("2011-04-19");
    const endDate = new Date("2011-04-19");
    const builds = await github.getRunsForProject(
      workload.id,
      ["octo-org"],
      "octo-repo",
      ["main"],
      startDate,
      endDate,
    );
    expect(builds).toHaveLength(1);
    expect(builds[0].branch).toBe("main");
    expect(builds[0].result).toBe(RunResult.Succeeded);
  });

  it(`lists job names`, async () => {
    const codepipeline = getPipelinesForWorkload(workload, "github-build-stage");

    const jobNames = await codepipeline.discoverJobNames(workload, "backend");
    expect(jobNames).toEqual(["octo-repo"]);
  });

  it(`returns no job names for nonexistent job group`, async () => {
    const codepipeline = getPipelinesForWorkload(workload, "github-build-stage");

    const jobNames = await codepipeline.discoverJobNames(workload, "no-such-group");
    expect(jobNames).toHaveLength(0);
  });

  it('gets a property of a run', async () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");

    const propValue = await github.getPipelineRunProperty(
      workload.id,
      'octo-org',
      'octo-repo',
      '30433642',
      '$.data.head_sha',
    );

    expect(propValue).toBe('acb5820ced9479c074f688cc328bf03f341a511d');
  });

  it('gets runs for job groups', async () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");

    const startDate = new Date(" 2011-04-19");
    const endDate = new Date("2011-04-19");
    const runs = await github.getRunsForJobGroups(
      workload.id,
      ['backend'],
      ['main'],
      startDate,
      endDate,
    );

    const groupRuns = runs.filter((r) => r.workloadId === "athena" && r.jobGroup === "backend");
    expect(groupRuns).toHaveLength(1);

    const run = groupRuns[0].run;
    expect(run.branch).toBe('main');
    expect(run.job).toBe('octo-repo');
    expect(run.repo).toBe('octo-repo');
    expect(run.result).toBe(RunResult.Succeeded);
  });

  it(`lists job names`, async () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");

    const jobNames = await github.discoverJobNames(workload, "backend");
    expect(jobNames).toEqual(["octo-repo"]);
  });

  it(`returns no job names for nonexistent job group`, async () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");

    const jobNames = await github.discoverJobNames(workload, "no-such-group");
    expect(jobNames).toHaveLength(0);
  });
});
