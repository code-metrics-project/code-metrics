/**
 * @group integration
 */

import { join } from "path";
import { loadConfig } from "../../../config/config";
import { PipelinesTypes, TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { RunResult } from "../../../model/runs";
import { initDatastore } from "../../../db/factory";
import { initCodePipelinePipelines } from "../codepipeline";
import { LogLevel, overrideLogLevel } from "../../../utils/logger/logger";
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
        jobNames: ["/.*Pipeline/"],
      },
    },
    stages: [{ stageId: "codepipeline-build-stage" }],
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

  process.env.AWS_REGION = "eu-west-2";
  process.env.AWS_ACCESS_KEY_ID = "not-a-real-key";
  process.env.AWS_SECRET_ACCESS_KEY = "not-a-real-key";

  await initDatastore();
  initCodePipelinePipelines();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/codepipeline"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {},
      pipelines: {
        codepipeline: {
          servers: [
            {
              id: "test-codepipeline",
              url: mockServer.baseUrl(),
              branches: [],
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
          id: "codepipeline-build-stage",
          description: "build stage",
          type: PipelinesTypes.CODEPIPELINE,
          serverId: "test-codepipeline",
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

describe(`Codepipeline Pipelines integration`, () => {
  it(`lists builds for a project`, async () => {
    const codepipeline = getPipelinesForWorkload(workload, "codepipeline-build-stage");

    const startDate = new Date("2020-01-22");
    const endDate = new Date("2020-01-22");
    const builds = await codepipeline.getRunsForProject(workload.id, ["FirstPipeline"], "", [""], startDate, endDate);
    expect(builds).toHaveLength(2);
    expect(builds[0].branch).toBe("");
    expect(builds[0].result).toBe(RunResult.Succeeded);
    expect(builds[0].job).toBe("FirstPipeline");
    expect(builds[0].repo).toBe("");
    expect(builds[0].startDate).toBe("2020-01-22");
    expect(builds[0].duration).toBe(60.405);
  });

  it(`lists job names`, async () => {
    const codepipeline = getPipelinesForWorkload(workload, "codepipeline-build-stage");

    const jobNames = await codepipeline.discoverJobNames(workload, "backend");
    expect(jobNames).toEqual(["FirstPipeline", "SecondPipeline"]);
  });

  it(`returns no job names for nonexistent job group`, async () => {
    const codepipeline = getPipelinesForWorkload(workload, "codepipeline-build-stage");

    const jobNames = await codepipeline.discoverJobNames(workload, "no-such-group");
    expect(jobNames).toHaveLength(0);
  });

  it("gets a property of a run", async () => {
    const codepipeline = getPipelinesForWorkload(workload, "codepipeline-build-stage");

    const propValue = await codepipeline.getPipelineRunProperty(
      workload.id,
      "octo-org",
      "octo-repo",
      "3137f7cb-7cf7-039j-s83l-d7eu3EXAMPLE",
      "$.pipelineExecution.artifactRevisions[0].revisionId",
    );

    expect(propValue).toBe("7636d59f3c461cEXAMPLE8417dbc6371");
  });
});
