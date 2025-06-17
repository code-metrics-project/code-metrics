/**
 * @group integration
 */

import { initAdoPipelines } from "../azure";
import { loadConfig } from "../../../config/config";
import { RunResult } from "../../../model/runs";
import { join } from "path";
import { mocks } from "@imposter-js/imposter";
import { PipelinesTypes, TicketManagementTypes } from "../../../model/config/common";
import { initDatastore } from "../../../db/factory";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";
import { getPipelinesForWorkload } from "../pipelinesService";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();

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
      { stageId: "azure-build-stage" },
    ],
  },
  projectManagement: {
    type: TicketManagementTypes.AZURE,
    serverId: "test-azure",
    tableName: undefined,
  },
  incidents: {
    type: TicketManagementTypes.AZURE,
    serverId: "test-azure",
    tableName: undefined,
  },
};

let mockServer;

beforeAll(async () => {
  await initDatastore();
  initAdoPipelines();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/azure"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {},
      pipelines: {
        azure: {
          servers: [
            {
              id: "test-azure",
              url: mockServer.baseUrl(),
              branches: ["main"],
              apiKey: "",
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
        id: "azure-build-stage",
        description: "build stage",
        type: PipelinesTypes.AZURE,
        serverId: "test-azure",
        projectName: "athena",
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

describe("Azure Pipelines integration", () => {
  it("returns builds for a matching repo", async () => {
    const azure = getPipelinesForWorkload(workload, "azure-build-stage");

    const builds = await azure.getRunsForProject(
      "athena",
      ["spring-petclinic"],
      "athena",
      [],
      new Date("2022-09-15"),
      new Date("2022-09-15"),
    );
    expect(builds).toHaveLength(2);
    expect(builds[0].result).toBe(RunResult.Succeeded);
    expect(builds[0].job).toBe("spring-petclinic");
  });

  it("returns no builds for non-matching repos", async () => {
    const azure = getPipelinesForWorkload(workload, "azure-build-stage");

    const builds = await azure.getRunsForProject(
      "athena",
      ["non-existent-repo"],
      "athena",
      [],
      new Date("2022-09-15"),
      new Date("2022-09-15"),
    );
    expect(builds).toHaveLength(0);
  });

  it('gets a property of a run', async () => {
    const azure = getPipelinesForWorkload(workload, "azure-build-stage");

    const propValue = await azure.getPipelineRunProperty(
      workload.id,
      'athena',
      'spring-petclinic',
      '2',
      '$.sourceVersion',
    );

    expect(propValue).toBe('80e98688993227435b416ae57aaa2625a30573c3');
  });

  it(`lists job names`, async () => {
    const azure = getPipelinesForWorkload(workload, "azure-build-stage");

    const jobNames = await azure.discoverJobNames(workload, "backend");
    expect(jobNames).toEqual(["octo-repo"]);
  });

  it(`returns no job names for nonexistent job group`, async () => {
    const azure = getPipelinesForWorkload(workload, "azure-build-stage");

    const jobNames = await azure.discoverJobNames(workload, "no-such-group");
    expect(jobNames).toHaveLength(0);
  });
});
