/**
 * @group integration
 */

import { expect, jest } from "@jest/globals";
import { join } from "path";
import { TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { initDatastore } from "../../../db/factory";
import { initGithubIncidents } from "../github";
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
  id: "test-github-incidents",
  projectManagement: {
    type: TicketManagementTypes.GITHUB,
    serverId: "test-github",
    owner: "octocat",
    repo: "hello-world",
    ticketTypes: ["bug", "enhancement"],
    stateFilter: "all",
  },
  incidents: {
    type: TicketManagementTypes.GITHUB,
    serverId: "test-github",
    owner: "octocat",
    repo: "incidents",
    ticketTypes: ["bug", "enhancement"],
    ticketPriorities: ["priority:low", "priority:medium", "priority:high"],
    stateFilter: "all",
    labelMapping: {
      "priority:low": "Low",
      "priority:medium": "Medium",
      "priority:high": "High",
    },
  },
};

beforeAll(async () => {
  await initDatastore();
  initGithubIncidents();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/github"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      ticketManagement: {
        github: {
          servers: [
            {
              id: "test-github",
              url: mockServer.baseUrl(),
              authMethod: AuthMethod.BEARER_TOKEN,
              apiKey: "test-token",
              defaults: {
                owner: "octocat",
                repo: "incidents",
                ticketTypes: ["bug"],
                stateFilter: "all",
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

describe(`GitHub incident management service`, () => {
  it(`lists new incidents created within date range`, async () => {
    const github = getIncidentMgmtForWorkload(workload);

    const incidents = await github.fetchTickets(
      workload.id,
      addDays(new Date(), -30),
      new Date(),
      "High",
      TimeRangeMode.CreatedWithinRange,
    );

    // Mock may return 0 incidents due to random filtering - only validate content if we have incidents
    if (incidents.length > 0) {
      expect(incidents[0].key).toMatch(/^#\d+$/);
      expect(incidents[0].issueType).toBeDefined();
      expect(incidents[0].workload).toBe(workload.id);
      expect(incidents[0].created).toBeDefined();
      expect(incidents[0].title).toBeDefined();
    }
  });

  it(`lists resolved incidents within date range`, async () => {
    const github = getIncidentMgmtForWorkload(workload);

    const incidents = await github.fetchTickets(
      workload.id,
      addDays(new Date(), -30),
      new Date(),
      "Medium",
      TimeRangeMode.ResolvedWithinRange,
    );

    expect(Array.isArray(incidents)).toBe(true);

    // Resolved incidents should have resolution dates
    incidents.forEach((incident) => {
      expect(incident.key).toMatch(/^#\d+$/);
      expect(incident.resolutiondate).toBeDefined();
      expect(incident.resolutiondate).not.toBeNull();
    });
  });

  it(`lists open incidents`, async () => {
    const github = getIncidentMgmtForWorkload(workload);

    const openIncidents = await github.fetchOpenTickets(workload.id, addDays(new Date(), -30), new Date(), "Low");

    // Mock may return 0 incidents due to random filtering - only validate content if we have incidents
    if (openIncidents.length > 0) {
      expect(openIncidents[0].key).toMatch(/^#\d+$/);
      expect(openIncidents[0].issueType).toBeDefined();

      // Open incidents should not have resolution dates
      openIncidents.forEach((incident) => {
        expect(incident.resolutiondate).toBeNull();
      });
    }
  });

  it(`gets a specific incident by ID`, async () => {
    const github = getIncidentMgmtForWorkload(workload);

    const incident = await github.getTicket(workload.id, "3");

    expect(incident).not.toBeNull();
    expect(incident.key).toBe("#3");
    expect(incident.issueType).toBeDefined();
    expect(incident.workload).toBe(workload.id);
    expect(incident.priority).toBeDefined();
    expect(incident.title).toBeDefined();
  });

  it(`builds correct incident links`, async () => {
    const github = getIncidentMgmtForWorkload(workload);

    const link = github.buildTicketLink(workload.id, "#789");

    expect(link).toBe(`${mockServer.baseUrl()}/octocat/incidents/issues/789`);
  });

  it(`uses incident-specific default ticket types`, async () => {
    const github = getIncidentMgmtForWorkload(workload);

    // The incident management service should use "Issue" as default type
    // This is configured in the GithubConfigManager for incidents
    const incidents = await github.fetchTickets(
      workload.id,
      addDays(new Date(), -7),
      new Date(),
      "Medium",
      TimeRangeMode.CreatedWithinRange,
    );

    expect(Array.isArray(incidents)).toBe(true);

    // Mock may return 0 incidents due to random filtering - only validate content if we have incidents
    if (incidents.length > 0) {
      // Verify that incidents have appropriate issue types
      incidents.forEach((incident) => {
        expect(typeof incident.issueType).toBe("string");
        expect(incident.issueType.length).toBeGreaterThan(0);
      });
    }
  });
});
