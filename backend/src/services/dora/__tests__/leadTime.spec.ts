import { loadConfig } from "../../../config/config";
import { TicketManagementTypes } from "../../../model/config/common";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

const workload: Workload = {
  codeAnalysis: undefined,
  codeManagement: undefined,
  incidents: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
  projectManagement: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
  pipelines: {
    stages: [{ stageId: "deployment-stage" }],
  },
  id: "athena",
};

beforeAll(async () => {
  jest.resetModules();
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeAnalysis: {},
      codeManagement: {},
      pipelines: {
        azure: {
          servers: [],
        },
        github: {
          servers: [],
        },
        jenkins: {
          servers: [],
        },
      },
      ticketManagement: {},
    },
    workloadConfig: {
      version: ConfigVersion.V2_0,
      workloads: [workload],
    },
  });
});

describe("Lead Time for Changes", () => {
  jest.mock("../../deployment/deploymentService", () => ({
    getDeploymentService: jest.fn().mockReturnValue({
      calculateLeadTimes: jest.fn().mockResolvedValue(
        new Map([
          [
            new Date("2011-04-19"),
            new Map([
              [
                "backend",
                {
                  count: 1,
                  total: 445339, // approx 5 days (in seconds)
                  deploys: [
                    {
                      run: "30433641",
                      job: "octo-repo",
                      repo: "octo-repo",
                      earliestCommit: new Date("2011-04-14T16:00:49.000Z"),
                      deployed: new Date("2011-04-19T19:43:08.000Z"),
                      leadTime: 445339,
                    },
                  ],
                },
              ],
            ]),
          ],
          [
            new Date("2011-04-20"),
            new Map([
              [
                "backend",
                {
                  count: 2,
                  total: 14400,
                  deploys: [
                    {
                      run: "30433642",
                      job: "octo-repo",
                      repo: "octo-repo",
                      earliestCommit: new Date("2011-04-20T17:00:00.000Z"),
                      deployed: new Date("2011-04-20T18:00:00.000Z"),
                      leadTime: 3600,
                    },
                    {
                      run: "30433643",
                      job: "octo-repo",
                      repo: "octo-repo",
                      earliestCommit: new Date("2011-04-20T17:00:00.000Z"),
                      deployed: new Date("2011-04-20T20:00:00.000Z"),
                      leadTime: 10800,
                    },
                  ],
                },
              ],
            ]),
          ],
        ]),
      ),
    }),
  }));

  it("should calculate lead time for changes", async () => {
    const { calculateLeadTime } = require("../leadTime");

    const leadTime = await calculateLeadTime(["athena"], ["backend"], new Date("2011-04-19"), new Date("2011-04-20"));
    expect(leadTime.size).toBe(2);

    const firstDay = leadTime.get("2011-04-19");
    expect(firstDay).toBeDefined();
    expect(firstDay["lead-time"].length).toBe(1);
    expect(
      firstDay["lead-time"].filter((l) => l.dimensions.workloadId === "athena" && l.dimensions.jobGroup === "backend"),
    ).toStrictEqual([
      {
        date: new Date("2011-04-19T00:00:00.000Z"),
        dimensions: { jobGroup: "backend", workloadId: "athena" },
        value: 445339, // approx 5 days (in seconds)
      },
    ]);

    const secondDay = leadTime.get("2011-04-20");
    expect(secondDay).toBeDefined();
    expect(secondDay["lead-time"].length).toBe(1); // should be average of 2 entries
    expect(
      secondDay["lead-time"].filter((l) => l.dimensions.workloadId === "athena" && l.dimensions.jobGroup === "backend"),
    ).toStrictEqual([
      {
        date: new Date("2011-04-20T00:00:00.000Z"),
        dimensions: { jobGroup: "backend", workloadId: "athena" },
        value: 7200,
      },
    ]);
  });
});
