/**
 * @group integration
 */

import { initDynatracePipelines } from "../dynatrace";
import { join } from "path";
import { loadConfig } from "../../../config/config";
import { PipelinesTypes, TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { RunResult } from "../../../model/runs";
import { initDatastore } from "../../../db/factory";
import { LogLevel, overrideLogLevel } from "../../../utils/logger/logger";
import * as process from "node:process";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";
import { getPipelinesForWorkload } from "../pipelinesService";

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
        jobNames: ["spring-petclinic"],
      },
    },
    stages: [{ stageId: "dynatrace-build-stage" }],
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
  initDynatracePipelines();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/dynatrace"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {},
      pipelines: {
        dynatrace: {
          servers: [
            {
              id: "test-dynatrace",
              url: mockServer.baseUrl(),
              apiKey: "dummy",
              dimensionNames: {
                runId: "commit-sha",
                startDate: "start-time-utc",
                endDate: "end-time-utc",
                outcome: "build-success",
                branch: "branch",
                repository: "repository",
                jobName: "sam-stack-name",
              },
              //entitySelector: "",
              metricSelector:
                "example.pipelines.deployment:splitBy(commit-sha,start-time-utc,end-time-utc,build-success,repository,sam-stack-name)",
              successfulOutcomeValue: "1",
              prefixProjectName: false,
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
          id: "dynatrace-build-stage",
          description: "build stage",
          type: PipelinesTypes.DYNATRACE,
          serverId: "test-dynatrace",
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

describe(`Dynatrace Pipelines integration`, () => {
  it(`lists builds for a project`, async () => {
    const dynatrace = getPipelinesForWorkload(workload, "dynatrace-build-stage");

    const startDate = new Date("2011-04-19");
    const endDate = new Date("2011-04-19");
    const builds = await dynatrace.getRunsForProject(
      workload.id,
      ["octo-org"],
      "spring-petclinic",
      ["main"],
      startDate,
      endDate,
    );
    expect(builds).toHaveLength(12);
    expect(builds[0].branch).toBeUndefined();
    expect(builds[0].result).toBe(RunResult.Succeeded);
  });

  it("gets a property of a run", async () => {
    const dynatrace = getPipelinesForWorkload(workload, "dynatrace-build-stage");

    const propValue = await dynatrace.getPipelineRunProperty(
      workload.id,
      "octo-org",
      "spring-petclinic",
      "30433642",
      "$.commit-sha",
    );

    expect(propValue).toBe("1e7c2b4eb848a566652f752284c4995c2e57bc05");
  });

  it("gets runs for jobs", async () => {
    const dynatrace = getPipelinesForWorkload(workload, "dynatrace-build-stage");

    const startDate = new Date("2011-04-19");
    const endDate = new Date("2011-04-19");
    const runs = await dynatrace.getRunsForJobs(workload.id, ["spring-petclinic"], ["main"], startDate, endDate);

    const groupRuns = runs.filter((r) => r.workloadId === "athena" && r.jobGroup === "backend");
    expect(groupRuns).toHaveLength(12);

    const run = groupRuns[0].run;
    expect(run.branch).toBeUndefined();
    expect(run.job).toBe("spring-petclinic");
    expect(run.repo).toBe("athena/spring-petclinic");
    expect(run.result).toBe(RunResult.Succeeded);
  });

  it(`lists job names`, async () => {
    const dynatrace = getPipelinesForWorkload(workload, "dynatrace-build-stage");

    const jobNames = await dynatrace.discoverJobNames(workload, { jobGroup: "backend" });
    expect(jobNames).toEqual(["spring-petclinic"]);
  });

  it(`returns no job names for nonexistent job group`, async () => {
    const dynatrace = getPipelinesForWorkload(workload, "dynatrace-build-stage");

    const jobNames = await dynatrace.discoverJobNames(workload, { jobGroup: "no-such-group" });
    expect(jobNames).toHaveLength(0);
  });
});
