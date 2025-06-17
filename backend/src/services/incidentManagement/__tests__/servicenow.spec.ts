/**
 * @group integration
 */

import { expect, jest } from "@jest/globals";
import { join } from "path";
import { TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { initDatastore } from "../../../db/factory";
import { initServiceNowIncidents } from "../servicenow";
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
  codeAnalysis: undefined, codeManagement: undefined, pipelines: undefined,
  id: "athena",
  incidents: {
    type: TicketManagementTypes.SERVICENOW,
    serverId: "test-servicenow",
    tableName: undefined,
  },
  projectManagement: {
    type: TicketManagementTypes.SERVICENOW,
    serverId: "test-servicenow",
    tableName: undefined,
  },
};

beforeAll(async () => {
  await initDatastore();
  initServiceNowIncidents();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/servicenow"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      ticketManagement: {
        servicenow: {
          servers: [
            {
              id: "test-servicenow",
              url: mockServer.baseUrl(),
              authMethod: AuthMethod.CUSTOM,
              apiKey: "testtoken",
              defaults: {
                ticketPriorities: ["1", "2", "3"],
                tableName: "incident",
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

describe(`a ServiceNow issue management service`, () => {
  it(`doesn't support listing open bugs`, async () => {
    const servicenow = getIncidentMgmtForWorkload(workload);

    const bugs = await servicenow.fetchOpenTickets(workload.id, addDays(new Date(), -7), new Date(), "3");
    expect(bugs).toHaveLength(0);
  });

  it(`lists incidents`, async () => {
    const servicenow = getIncidentMgmtForWorkload(workload);

    const incidents = await servicenow.fetchTickets(workload.id, addDays(new Date(), -7), new Date(), "3", TimeRangeMode.CreatedWithinRange);
    expect(incidents.length).toBeGreaterThanOrEqual(1);

    const firstIssue = incidents[0];
    expect(firstIssue.key).not.toBeNull();
    expect(firstIssue.issueType).toBe("incident");
    expect(firstIssue.workload).toBe("athena");
    expect(firstIssue.priority).toBe("3");
    expect(firstIssue.title).toBe("Unable to connect to email");
  });

  it(`doesn't support listing issue IDs`, async () => {
    const servicenow = getIncidentMgmtForWorkload(workload);

    const bugs = await servicenow.getAllTicketIds(workload, 7);
    expect(bugs).toHaveLength(0);
  });

  it(`gets an issue`, async () => {
    const servicenow = getIncidentMgmtForWorkload(workload);

    const issue = await servicenow.getTicket(workload.id, "INC0000060");

    expect(issue.key).not.toBeNull();
    expect(issue.issueType).toBe("incident");
    expect(issue.workload).toBe("athena");
    expect(issue.priority).toBe("3");
    expect(issue.title).toBe("Unable to connect to email");
  });
});
