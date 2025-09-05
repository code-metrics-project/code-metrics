import { loadConfig } from "../../../config/config";
import { jest } from "@jest/globals";
import { TicketManagementTypes } from "../../../model/config/common";
import { calculateTimeToRestore } from "../timeToRestore";
import { registerIncidentMgmt } from "../../incidentManagement/incidentMgmtService";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

const workload: Workload = {
  codeAnalysis: undefined,
  codeManagement: undefined,
  pipelines: undefined,
  incidents: {
    type: TicketManagementTypes.JIRA,
    serverId: "mock-jira",
  } as any,
  id: "athena",
  projectManagement: {
    type: TicketManagementTypes.JIRA,
    serverId: "mock-jira",
  } as any,
};

beforeAll(async () => {
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

describe("time to restore service", () => {
  it("should fetch time to restore service", async () => {
    const incidents = [
      {
        created: "2021-01-01T00:00:00.000Z",
        resolutiondate: "2021-01-01T12:00:00.000Z",
        key: "ATHENA-1",
      },
      {
        created: "2021-01-01T00:00:00.000Z",
        resolutiondate: "2021-01-02T09:00:00.000Z",
        key: "ATHENA-2",
      },
      {
        created: "2021-01-02T00:00:00.000Z",
        resolutiondate: "2021-01-02T06:00:00.000Z",
        key: "ATHENA-3",
      },
      {
        created: "2021-01-02T00:00:00.000Z",
        resolutiondate: undefined,
        key: "ATHENA-4",
      },
    ];

    registerIncidentMgmt(
      TicketManagementTypes.JIRA,
      () =>
        ({
          fetchTickets: jest.fn().mockReturnValue(Promise.resolve(incidents)),
        }) as any,
    );

    const result = await calculateTimeToRestore([workload.id], new Date("2021-01-01"), new Date("2021-01-02"), "High");

    expect(result.size).toBe(2);

    // record on resolution date
    const firstDay = result.get("2021-01-01");
    expect(firstDay["time-to-restore"].length).toBe(1);

    const day1Metrics = firstDay["time-to-restore"].filter((t) => t.dimensions.workloadId === "athena");
    expect(day1Metrics).toHaveLength(1);
    expect(day1Metrics[0].date).toStrictEqual(new Date("2021-01-01T12:00:00.000Z"));
    expect(day1Metrics[0].value).toBe(43200);

    const secondDay = result.get("2021-01-02");
    expect(secondDay["time-to-restore"].length).toBe(2);

    const day2Metrics = secondDay["time-to-restore"].filter((t) => t.dimensions.workloadId === "athena");
    expect(day2Metrics).toHaveLength(2);
    expect(day2Metrics[0].date).toStrictEqual(new Date("2021-01-02T09:00:00.000Z"));
    expect(day2Metrics[0].value).toBe(118800);
    expect(day2Metrics[1].date).toStrictEqual(new Date("2021-01-02T06:00:00.000Z"));
    expect(day2Metrics[1].value).toBe(21600);
  });
});
