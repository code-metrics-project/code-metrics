import { loadConfig } from "../../../config/config";
import { TicketManagementTypes } from "../../../model/config/common";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

const workload: Workload = {
  codeAnalysis: undefined, codeManagement: undefined,
  projectManagement: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
  id: "athena",
  pipelines: {
    stages: [
      { stageId: "deployment-stage" },
    ],
  },
  incidents: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
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

describe('Deployment Frequency', () => {
  jest.mock("../../deployment/deploymentService", () => ({
    getDeploymentService: jest.fn().mockReturnValue({
      fetchDeployments: jest.fn().mockResolvedValue({
        backend: [
          {
            "id": "30433641",
            "job": "octo-repo",
            "branch": "main",
            "startDate": "2011-04-19T12:33:08Z",
            "result": "SUCCEEDED",
            "repo": "octo-repo",
            "duration": 200
          }, {
            "id": "30433642",
            "job": "octo-repo",
            "branch": "main",
            "startDate": "2011-04-19T19:33:08Z",
            "result": "SUCCEEDED",
            "repo": "octo-repo",
            "duration": 600
          }, {
            "id": "30433643",
            "job": "octo-repo",
            "branch": "main",
            "startDate": "2011-04-20T10:33:08Z",
            "result": "SUCCEEDED",
            "repo": "octo-repo",
            "duration": 400
          },
        ],
      }),
    }),
  }));

  it('should calculate deployment frequency', async () => {
    const { calculateDeploymentFrequency } = require("../deploymentFrequency");

    const deploymentFrequency = await calculateDeploymentFrequency(
      ["athena"],
      ["backend"],
      new Date("2011-04-19"),
      new Date("2011-04-20")
    );
    expect(deploymentFrequency.size).toBe(2);

    const firstDay = deploymentFrequency.get("2011-04-19");
    expect(firstDay).toBeDefined();
    expect(firstDay["deployment-frequency"].length).toBe(1);
    expect(firstDay["deployment-frequency"].filter((d) => d.dimensions.workloadId === "athena" && d.dimensions.jobGroup === "backend")).toStrictEqual([{
      dimensions: { jobGroup: "backend", workloadId: "athena" },
      date: new Date("2011-04-19T00:00:00.000Z"),
      value: 2,
    }]);

    const secondDay = deploymentFrequency.get("2011-04-20");
    expect(secondDay).toBeDefined();
    expect(secondDay["deployment-frequency"].length).toBe(1);
    expect(secondDay["deployment-frequency"].filter((d) => d.dimensions.workloadId === "athena" && d.dimensions.jobGroup === "backend")).toStrictEqual([{
      dimensions: { jobGroup: "backend", workloadId: "athena" },
      date: new Date("2011-04-20T00:00:00.000Z"),
      value: 1,
    }]);
  });
});
