/**
 * @group integration
 */

import { getDeploymentService } from "../deploymentService";
import { join } from "path";
import { Run, RunResult } from "../../../model/runs";
import { loadConfig } from "../../../config/config";
import { initGithubPipelines } from "../../pipelines/github";
import { initDatastore } from "../../../db/factory";
import { CodeManagementTypes, PipelinesTypes, TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { initGithubVcs } from "../../codeManagement/github";
import { truncateDateOnly } from "../../../utils/date";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();
jest.setTimeout(30000);

describe("DeploymentService", () => {
  const workload: Workload = {
    codeAnalysis: undefined,
    id: "athena",
    codeManagement: {
      type: CodeManagementTypes.GITHUB,
      serverId: "test-github",
      projectName: "octocat",
      repoGroups: {
        backend: {
          components: [{ name: "octo-repo", repo: "octo-repo" }],
        },
      },
    },
    pipelines: {
      type: PipelinesTypes.GITHUB,
      serverId: "test-github",
      projectName: "octocat",
      jobGroups: {
        backend: {
          jobNames: ["octo-repo"],
        },
      },
      stages: [
        {
          stageId: "deployment-stage",
          jobMapping: {},
        },
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

  let mockServer;
  beforeAll(async () => {
    await initDatastore();
    initGithubVcs();
    initGithubPipelines();
    mockServer = await startGitHubMock(workload);
  });
  afterAll(async () => {
    await mockServer?.stop();
  });

  it("should get a single deployment pipeline configuration for a workload", async () => {
    const service = getDeploymentService();

    const config = service.getStageConfigForWorkload(workload, "deployment-stage");
    expect(config.id).toBe("deployment-stage");
    expect(config.commitMapping.runProperty).toBe("$.data.head_sha");
  });

  it("should find the PR associated with a run", async () => {
    const service = getDeploymentService();

    const run: Run = {
      id: "123",
      job: "octo-repo",
      repo: "octo-repo",
      branch: "main",
      startDate: "2021-01-01T00:00:00Z",
      duration: 60,
      result: RunResult.Succeeded,
    };
    const pr = await service.findPrForRun("athena", "deployment-stage", run);
    expect(pr.id).toBe(1347);
    expect(pr.title).toBe("Amazing new feature");
  });

  it("should calculate the date bounds for a run", async () => {
    const service = getDeploymentService();

    const run: Run = {
      id: "123",
      job: "octo-repo",
      repo: "octo-repo",
      branch: "main",
      startDate: "2011-04-19T00:00:00Z",
      duration: 60,
      result: RunResult.Succeeded,
    };
    const bounds = await service.getDateBounds("athena", "deployment-stage", run);

    // earliest commit date
    expect(bounds.start).toStrictEqual(new Date("2011-04-14T16:00:49.000Z"));

    // run start time + 60 seconds
    expect(bounds.end).toStrictEqual(new Date("2011-04-19T00:01:00Z"));
  });

  it("should calculate the lead times for a workload", async () => {
    const service = getDeploymentService();

    const startDate = new Date("2011-04-19");
    const endDate = new Date("2011-04-19");

    const leadTimes = await service.calculateLeadTimes("athena", "deployment-stage", ["backend"], startDate, endDate);
    expect(leadTimes.size).toBe(1);

    for (const [date, metrics] of leadTimes) {
      expect(truncateDateOnly(date)).toBe("2011-04-19");
      expect(metrics.size).toBe(1);
      expect(metrics.get("backend")).toStrictEqual({
        count: 1,
        total: 445339, // approx 5 days (in seconds)
        deploys: [
          {
            date: "2011-04-19",
            run: "30433642",
            job: "octo-repo",
            repo: "octo-repo",
            earliestCommit: new Date("2011-04-14T16:00:49.000Z"),
            deployed: new Date("2011-04-19T19:43:08.000Z"),
            leadTime: 445339,
            workloadId: "athena",
          },
        ],
      });
    }
  });

  it("should fetch the deployments for a workload by job group", async () => {
    const service = getDeploymentService();

    const startDate = new Date("2011-04-19");
    const endDate = new Date("2011-04-19");

    const deployments = await service.fetchDeployments("athena", "deployment-stage", ["backend"], startDate, endDate);
    expect(deployments["backend"]).toHaveLength(1);

    for (const [jobGroup, runs] of Object.entries(deployments)) {
      expect(jobGroup).toBe("backend");
      expect(runs).toHaveLength(1);
      expect(runs[0]).toStrictEqual({
        id: "30433642",
        job: "octo-repo",
        branch: "main",
        startDate: "2011-04-19T19:33:08Z",
        result: "SUCCEEDED",
        repo: "octo-repo",
        duration: 600,
        user: "octocat",
        userType: "User",
      });
    }
  });
});

async function startGitHubMock(workload: Workload) {
  const mockServer = await mocks.start(join(__dirname, "../../../../../mocks/github"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {
        github: {
          servers: [
            {
              id: "test-github",
              url: mockServer.baseUrl(),
              apiKey: "dummy",
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
              apiKey: "dummy",
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
          id: "deployment-stage",
          description: "deployment stage",
          type: PipelinesTypes.GITHUB,
          serverId: "test-github",
          projectName: "octo-org",
          commitMapping: {
            runProperty: "$.data.head_sha",
          },
        },
      ],
    },
  });
  return mockServer;
}
