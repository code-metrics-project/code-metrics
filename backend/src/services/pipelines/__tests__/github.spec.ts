/**
 * @group integration
 */

import { initGithubPipelines } from "../github";
import { getPipelinesForWorkload } from "../pipelinesService";
import { join } from "path";
import { loadConfig } from "../../../config/config";
import { CodeManagementTypes, PipelinesTypes, TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { RunResult } from "../../../model/runs";
import { initDatastore } from "../../../db/factory";
import { LogLevel, overrideLogLevel } from "../../../utils/logger/logger";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";
import { initGithubVcs } from "../../codeManagement/github";
import { AuthMethod } from "../../../model/config/remote-config";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();
let mockServer;

const workload: Workload = {
  codeAnalysis: undefined,
  codeManagement: {
    type: CodeManagementTypes.GITHUB,
    serverId: "test-github",
    projectName: "octocat",
    repoGroups: {
      backend: {
        components: [{ name: "hello-world", repo: "hello-world" }],
      },
    },
  },
  id: "athena",
  pipelines: {
    jobGroups: {
      backend: {
        jobNames: ["CI"],
      },
    },
    stages: [{ stageId: "github-build-stage" }],
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
  qualityGates: undefined,
};

beforeAll(async () => {
  overrideLogLevel(LogLevel.Verbose);

  await initDatastore();
  initGithubPipelines();
  initGithubVcs();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/github"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {
        github: {
          servers: [
            {
              id: "test-github",
              url: mockServer.baseUrl(),
              apiKey: process.env.GITHUB_TOKEN,
            },
          ],
        },
      },
      pipelines: {
        github: {
          servers: [
            {
              id: "test-github",
              url: mockServer.baseUrl(),
              branches: ["main"],
              authMethod: AuthMethod.GITHUB_APP,
              githubApp: {
                appId: "test-app-id",
                privateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest-key\n-----END RSA PRIVATE KEY-----",
                installationId: "12345",
              },
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
      stages: [
        {
          id: "github-build-stage",
          description: "build stage",
          type: PipelinesTypes.GITHUB,
          serverId: "test-github",
          projectName: "DeloitteDigitalUK",
          commitMapping: {
            runProperty: "$.data.head_sha",
          },
        },
      ],
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
      ["octocat"],
      "hello-world",
      ["main"],
      startDate,
      endDate,
    );
    expect(builds).toHaveLength(2);
    expect(builds.every((b) => b.branch === "main")).toBe(true);
    expect(builds.map((b) => b.id).sort()).toEqual(["30433642", "30433643"]);
    expect(builds.every((b) => Object.values(RunResult).includes(b.result))).toBe(true);
  });

  it(`lists job names`, async () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");

    const jobNames = await github.discoverJobNames(workload, { jobGroup: "backend" });
    expect(jobNames).toEqual(["CI"]);
  });

  it(`returns no job names for nonexistent job group`, async () => {
    const codepipeline = getPipelinesForWorkload(workload, "github-build-stage");

    const jobNames = await codepipeline.discoverJobNames(workload, { jobGroup: "no-such-group" });
    expect(jobNames).toHaveLength(0);
  });

  it("gets a property of a run", async () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");

    const propValue = await github.getPipelineRunProperty(
      workload.id,
      "octocat",
      "hello-world",
      "30433642",
      "$.data.head_sha",
    );

    expect(propValue).toBe("acb5820ced9479c074f688cc328bf03f341a511d");
  });

  it("gets runs for jobs", async () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");

    const startDate = new Date(" 2011-04-19");
    const endDate = new Date("2011-04-19");
    const runs = await github.getRunsForJobs(workload.id, ["CI"], ["main"], startDate, endDate);

    const groupRuns = runs.filter((r) => r.workloadId === "athena" && r.jobGroup === "backend");
    expect(groupRuns).toHaveLength(2);
    expect(groupRuns.every((r) => r.stageId === "github-build-stage")).toBe(true);
    expect(groupRuns.map((r) => r.run.id).sort()).toEqual(["30433642", "30433643"]);
    expect(groupRuns.every((r) => r.run.branch === "main")).toBe(true);
    expect(groupRuns.every((r) => r.run.job === "CI")).toBe(true);
    expect(groupRuns.every((r) => r.run.repo === "hello-world")).toBe(true);
    expect(groupRuns.every((r) => Object.values(RunResult).includes(r.run.result))).toBe(true);
  });

  it("builds correct run links for GitHub.com API URL", () => {
    const github = getPipelinesForWorkload(workload, "github-build-stage");
    const link = github.buildRunLink(workload.id, "hello-world", "12345");

    // For mock server, URL should pass through unchanged (localhost)
    expect(link).toContain("/DeloitteDigitalUK/hello-world/actions/runs/12345");
  });
});
