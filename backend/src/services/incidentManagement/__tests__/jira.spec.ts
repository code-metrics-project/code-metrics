/**
 * @group integration
 */

import { expect, jest } from "@jest/globals";
import { join } from "path";
import { TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { initDatastore } from "../../../db/factory";
import { initJiraIncidents } from "../jira";
import { getIncidentMgmtForWorkload } from "../incidentMgmtService";
import { addDays } from "date-fns";
import { loadConfig } from "../../../config/config";
import { TimeRangeMode } from "../../tickets/ticketService";
import { AuthMethod } from "../../../model/config/remote-config";
import { Workload } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();
let mockServer;

const workload: Workload = {
  codeAnalysis: undefined,
  codeManagement: undefined,
  pipelines: undefined,
  id: "athena",
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
};

beforeAll(async () => {
  await initDatastore();
  initJiraIncidents();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/jira"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      ticketManagement: {
        jira: {
          servers: [
            {
              id: "test-jira",
              url: mockServer.baseUrl(),
              authMethod: AuthMethod.BASIC_AUTH,
              email: "user@example.com",
              apiKey: "testtoken",
              defaults: {
                ticketPriorities: ["Low", "Medium", "High"],
                ticketTypes: ["Incident"],
                projectName: "ATHENA",
              },
            },
          ],
        },
      },
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
    },
    workloadConfig: {
      version: ConfigVersion.V2_0,
      workloads: [workload],
    },
  });
});
afterAll(async () => {
  await mockServer?.stop();
});

describe(`a Jira issue management service`, () => {
  it(`lists incidents`, async () => {
    const jira = getIncidentMgmtForWorkload(workload);

    const incidents = await jira.fetchTickets(
      workload.id,
      addDays(new Date(), -7),
      new Date(),
      "Low",
      TimeRangeMode.CreatedWithinRange,
    );
    expect(incidents.length).toBeGreaterThanOrEqual(1);
    expect(incidents[0].key).not.toBeNull();
    expect(incidents[0].issueType).toBe("Incident");
  });

  it(`lists open incidents`, async () => {
    const jira = getIncidentMgmtForWorkload(workload);

    const bugs = await jira.fetchOpenTickets(workload.id, addDays(new Date(), -7), new Date(), "Low");
    expect(bugs.length).toBeGreaterThanOrEqual(1);
    expect(bugs[0].key).not.toBeNull();
    expect(bugs[0].issueType).toBe("Incident");
  });

  it(`lists incident IDs`, async () => {
    const jira = getIncidentMgmtForWorkload(workload);

    const incidents = await jira.getAllTicketIds(workload, 7);
    expect(incidents.length).toBeGreaterThanOrEqual(1);
    expect(incidents[0]).not.toBeNull();
  });

  it(`gets an incident`, async () => {
    const jira = getIncidentMgmtForWorkload(workload);

    const issue = await jira.getTicket(workload.id, "DEV-10001");

    expect(issue.key).not.toBeNull();
    expect(issue.issueType).toBe("Bug");
    expect(issue.workload).toBe("athena");
    expect(issue.priority).not.toBeNull();
    expect(issue.title).not.toBeNull();
  });
});
