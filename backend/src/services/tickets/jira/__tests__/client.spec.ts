/**
 * @group integration
 */

import { expect, jest } from "@jest/globals";
import { join } from "path";
import { JiraTicketOptions, TicketManagementTypes } from "../../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { loadConfig } from "../../../../config/config";
import { AuthMethod } from "../../../../model/config/remote-config";
import { WorkloadTicketConfigJira } from "../../../../model/config/workload-config";
import { ConfigVersion } from "../../../../model/config/base";
import { createJiraClient, JiraClientType } from "../client";
import { JiraConfigManager } from "../service";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();

let mockServer;

const configManager: JiraConfigManager = {
  getServerConfig: () => {
    return {
      id: "test-jira",
      url: mockServer.baseUrl(),
      authMethod: AuthMethod.BASIC_AUTH,
      email: "user@example.com",
      apiKey: "testtoken",
      defaults: {
        ticketPriorities: ["Low", "Medium", "High"],
        ticketTypes: ["Issue"],
        projectName: "ATHENA",
      },
    };
  },
  getWorkloadConfig: () => {
    return <WorkloadTicketConfigJira>{
      serverId: "test-jira",
      type: TicketManagementTypes.JIRA,
    };
  },
  getDefaultTicketTypes: () => ["Bug"],
  getServerDefaults: () => {
    return <JiraTicketOptions>{};
  },
};

beforeAll(async () => {
  mockServer = await mocks.start(join(__dirname, "../../../../../../mocks/jira"));

  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      ticketManagement: {},
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
      workloads: [],
    },
  });
});
afterAll(async () => {
  await mockServer?.stop();
});

describe(`a V2 Jira client`, () => {
  it(`lists issues`, async () => {
    const jira = createJiraClient(configManager, JiraClientType.REST_API_V2_SEARCH);
    const issues = await jira.fetchAllIssuesViaAPI(
      `project = ATHENA AND issuetype in ("Bug") AND created >= -7d ORDER BY created DESC`,
      "athena",
      ["key", "issuetype", "created", "priority", "summary"],
    );
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].key).not.toBeNull();
    expect(issues[0].fields).not.toBeNull();
    expect(issues[0].fields.issuetype).toStrictEqual({ name: "Bug" });
    expect(issues[0].fields.created).not.toBeNull();
    expect(issues[0].fields.priority).not.toBeNull();
    expect(issues[0].fields.summary).not.toBeNull();
  });
});

describe(`a V3 Jira client`, () => {
  it(`lists issues`, async () => {
    const jira = createJiraClient(configManager, JiraClientType.REST_API_V3_SEARCH_JQL);
    const issues = await jira.fetchAllIssuesViaAPI(
      `project = ATHENA AND issuetype in ("Bug") AND created >= -7d ORDER BY created DESC`,
      "athena",
      ["key", "issuetype", "created", "priority", "summary"],
    );
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].key).not.toBeNull();
    expect(issues[0].fields).not.toBeNull();
    expect(issues[0].fields.issuetype).toStrictEqual({ name: "Bug" });
    expect(issues[0].fields.created).not.toBeNull();
    expect(issues[0].fields.priority).not.toBeNull();
    expect(issues[0].fields.summary).not.toBeNull();
  });
});
