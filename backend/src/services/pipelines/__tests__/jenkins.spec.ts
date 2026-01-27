/**
 * @group integration
 */

import { initJenkinsPipelines } from "../jenkins";
import { join } from "path";
import { loadConfig } from "../../../config/config";
import { mocks } from "@imposter-js/imposter";
import { RunResult } from "../../../model/runs";
import { initDatastore } from "../../../db/factory";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";
import { getPipelinesForWorkload } from "../pipelinesService";
import { PipelinesTypes, TicketManagementTypes } from "../../../model/config/common";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();
let mockServer;

const workload: Workload = {
  codeAnalysis: undefined,
  codeManagement: undefined,
  id: "athena",
  pipelines: {
    jobGroups: {
      backend: {
        jobNames: ["Athena_platform"],
      },
    },
    stages: [{ stageId: "jenkins-build-stage" }],
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
  await initDatastore();
  initJenkinsPipelines();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/jenkins"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {},
      pipelines: {
        jenkins: {
          servers: [
            {
              id: "test-jenkins",
              url: mockServer.baseUrl(),
              apiKey: "ABC",
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
          id: "jenkins-build-stage",
          description: "build stage",
          type: PipelinesTypes.JENKINS,
          serverId: "test-jenkins",
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

describe(`Jenkins CICD integration`, () => {
  it(`lists builds for a project`, async () => {
    const jenkins = getPipelinesForWorkload(workload, "jenkins-build-stage");

    const startDate = new Date("2020-01-22");
    const endDate = new Date("2024-01-22");
    const builds = await jenkins.getRunsForProject(
      workload.id,
      ["Athena_platform"],
      "octo-repo",
      ["main"],
      startDate,
      endDate,
    );
    expect(builds).toHaveLength(7);
    expect(builds[0].branch).toMatch("main");
    expect(builds[0].result).toMatch(RunResult.Succeeded);
    expect(builds[0].duration).toBe(3);
  });

  it(`lists job names`, async () => {
    const jenkins = getPipelinesForWorkload(workload, "jenkins-build-stage");

    const jobNames = await jenkins.discoverJobNames(workload, { jobGroup: "backend" });
    expect(jobNames).toEqual(["Athena_platform" ]);
  });

  it("gets runs for jobs", async () => {
    const jenkins = getPipelinesForWorkload(workload, "jenkins-build-stage");

    const startDate = new Date("2020-01-22");
    const endDate = new Date("2024-01-22");
    const runs = await jenkins.getRunsForJobs(workload.id, ["Athena_platform"], ["main"], startDate, endDate);

    expect(runs).toHaveLength(7);
    expect(runs[0].workloadId).toBe("athena");

    const run = runs[0].run;
    expect(run.job).toBe("athena-folder/Athena_platform/main");
    expect(run.result).toBe(RunResult.Succeeded);
  });

  it(`returns no job names for nonexistent job group`, async () => {
    const jenkins = getPipelinesForWorkload(workload, "jenkins-build-stage");

    const jobNames = await jenkins.discoverJobNames(workload, { jobGroup: "no-such-group" });
    expect(jobNames).toHaveLength(0);
  });
});
