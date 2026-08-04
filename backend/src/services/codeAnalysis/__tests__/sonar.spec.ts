import { getComponentKey, parseHistoryResponse } from "../sonar";
import { CodeAnalysisTypes, TicketManagementTypes } from "../../../model/config/common";
import { loadConfig } from "../../../config/config";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

const workload: Workload = {
  id: "athena",
  codeAnalysis: {
    type: CodeAnalysisTypes.SONAR,
    serverId: "test-sonar",
    componentKeyPrefix: "prefix_",
  },
  projectManagement: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
  codeManagement: undefined,
  pipelines: undefined,
  incidents: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
};

beforeAll(async () => {
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeAnalysis: {
        sonar: {
          servers: [
            {
              id: "test-sonar",
              url: "",
              apiKey: "",
            },
          ],
        },
      },
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

describe("parseHistoryResponse", () => {
  const response = {
    measures: [
      {
        history: [
          // before the start date
          {
            date: "2022-01-01T12:00:00+0000",
            value: "80",
          },
          // after the start date
          {
            date: "2022-03-01T12:00:00+0000",
            value: "100",
          },
        ],
      },
    ],
  };
  const parsed = parseHistoryResponse(response, new Date("2022-02-01"));

  it("should return the same number of entries", () => {
    expect(parsed.measures.length).toBe(response.measures.length);
    expect(parsed.measures[0].history.length).toBe(response.measures[0].history.length);
  });

  it("resets the start date of prior entries", () => {
    // Entry before start date should have date set to start date.
    // It should have its date/timestamp truncated.
    const before = parsed.measures[0].history.find((h) => h.date === "2022-02-01");
    expect(before.date).toBe("2022-02-01");
  });

  it("applies date truncation to all entries", () => {
    // Entry after start date should have its date/timestamp truncated.
    const after = parsed.measures[0].history.find((h) => h.date === "2022-03-01");
    expect(after.date).toBe("2022-03-01");
  });
});

describe("getComponentKey", () => {
  it("prepends the prefix to the component key", () => {
    const componentKey = getComponentKey(workload.id, "frontend");
    expect(componentKey).toBe("prefix_frontend");
  });
});
