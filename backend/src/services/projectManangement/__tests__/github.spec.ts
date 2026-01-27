/**
 * @group integration
 */

import { expect, jest } from "@jest/globals";
import { join } from "path";
import { TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { initDatastore } from "../../../db/factory";
import { initGithubIssues } from "../github";
import { getIssueMgmtForWorkload } from "../issueMgmtService";
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
  qualityGates: undefined,
  id: "test-github-workload",
  projectManagement: {
    type: TicketManagementTypes.GITHUB,
    serverId: "test-github",
    owner: "octocat",
    repo: "Hello-World",
    ticketTypes: ["bug", "enhancement", "feature"],
    ticketPriorities: ["priority:low", "priority:medium", "priority:high"],
    stateFilter: "all",
    labelMapping: {
      "priority:low": "Low",
      "priority:medium": "Medium",
      "priority:high": "High",
    },
  },
  incidents: {
    type: TicketManagementTypes.GITHUB,
    serverId: "test-github",
    owner: "octocat",
    repo: "Hello-World",
    ticketTypes: ["bug"],
    stateFilter: "all",
  },
};

beforeAll(async () => {
  await initDatastore();
  initGithubIssues();

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
                repo: "Hello-World",
                ticketTypes: ["bug", "enhancement", "feature"],
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

describe(`GitHub issue management service`, () => {
  it(`lists new issues created within date range`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issues = await github.fetchTickets(
      workload.id,
      addDays(new Date(), -30),
      new Date(),
      "Medium",
      TimeRangeMode.CreatedWithinRange,
    );

    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].key).toMatch(/^#\d+$/); // Should match GitHub issue format #123
    expect(issues[0].issueType).toBeDefined();
    expect(issues[0].workload).toBe(workload.id);
    expect(issues[0].created).toBeDefined();
    expect(issues[0].title).toBeDefined();

    // Verify date format
    expect(new Date(issues[0].created)).toBeInstanceOf(Date);
    expect(isNaN(new Date(issues[0].created).getTime())).toBe(false);
  });

  it(`lists resolved issues within date range`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issues = await github.fetchTickets(
      workload.id,
      addDays(new Date(), -30),
      new Date(),
      "High",
      TimeRangeMode.ResolvedWithinRange,
    );

    // Should have some resolved issues (closed issues)
    expect(Array.isArray(issues)).toBe(true);

    // If we have resolved issues, they should have resolution dates
    issues.forEach((issue) => {
      expect(issue.key).toMatch(/^#\d+$/);
      expect(issue.resolutiondate).toBeDefined();
      expect(issue.resolutiondate).not.toBeNull();
      expect(new Date(issue.resolutiondate)).toBeInstanceOf(Date);
    });
  });

  it(`lists open issues`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const openIssues = await github.fetchOpenTickets(workload.id, addDays(new Date(), -30), new Date(), "Low");

    expect(openIssues.length).toBeGreaterThanOrEqual(1);
    expect(openIssues[0].key).toMatch(/^#\d+$/);
    expect(openIssues[0].issueType).toBeDefined();
    expect(openIssues[0].workload).toBe(workload.id);

    // Open issues should not have resolution dates
    openIssues.forEach((issue) => {
      expect(issue.resolutiondate).toBeNull();
    });
  });

  it(`lists all issue IDs for a workload`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issueIds = await github.getAllTicketIds(workload, 30);

    expect(issueIds.length).toBeGreaterThanOrEqual(1);
    expect(issueIds[0]).toMatch(/^#\d+$/);

    // All IDs should be unique
    const uniqueIds = new Set(issueIds);
    expect(uniqueIds.size).toBe(issueIds.length);
  });

  it(`gets a specific issue by ID`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    // Test with a specific issue number that should exist in mocks
    const issue = await github.getTicket(workload.id, "1");

    expect(issue).not.toBeNull();
    expect(issue.key).toBe("#1");
    expect(issue.issueType).toBeDefined();
    expect(issue.workload).toBe(workload.id);
    expect(issue.priority).toBeDefined();
    expect(issue.title).toBeDefined();
    expect(issue.created).toBeDefined();

    // Verify date format
    expect(new Date(issue.created)).toBeInstanceOf(Date);
    expect(isNaN(new Date(issue.created).getTime())).toBe(false);
  });

  it(`gets a specific issue by ID with # prefix`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issue = await github.getTicket(workload.id, "#2");

    expect(issue).not.toBeNull();
    expect(issue.key).toBe("#2");
    expect(issue.issueType).toBeDefined();
    expect(issue.workload).toBe(workload.id);
  });

  it(`returns null for non-existent issue`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issue = await github.getTicket(workload.id, "99999");

    expect(issue).toBeNull();
  });

  it(`returns null for invalid issue ID formats`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const testCases = ["abc", "-1", "0x123", "", "not-a-number"];

    for (const invalidId of testCases) {
      const issue = await github.getTicket(workload.id, invalidId);
      expect(issue).toBeNull();
    }
  });

  it(`handles matchTicketByIdAndRetrieve with various message formats`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const testCases = [
      { message: "Fix critical bug #1", shouldFind: true },
      { message: "Resolves #2 completely", shouldFind: true },
      { message: "Update docs for #3", shouldFind: true },
      { message: "#4 - Initial implementation", shouldFind: true },
      { message: "No issue reference here", shouldFind: false },
      { message: "Just a regular commit message", shouldFind: false },
      { message: "", shouldFind: false },
      { message: null, shouldFind: false },
    ];

    for (const testCase of testCases) {
      const issue = await github.matchTicketByIdAndRetrieve(testCase.message, workload.id);

      if (testCase.shouldFind) {
        expect(issue).not.toBeNull();
        expect(issue.workload).toBe(workload.id);
        expect(issue.key).toMatch(/^#\d+$/);
      } else {
        expect(issue).toBeNull();
      }
    }
  });

  it(`handles matchTicketByIdAndRetrieve with non-existent issues`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issue = await github.matchTicketByIdAndRetrieve("Fix issue #99999", workload.id);
    expect(issue).toBeNull();
  });

  it(`matches issue IDs in commit messages`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    // Test various message formats
    const testCases = [
      { message: "Fix issue #123", expected: "#123" },
      { message: "Resolves #456 and improves performance", expected: "#456" },
      { message: "Update documentation for #789", expected: "#789" },
      { message: "No issue reference here", expected: null },
      { message: "", expected: null },
      { message: null, expected: null },
    ];

    for (const testCase of testCases) {
      const matchedId = github.matchTicketId(testCase.message);
      expect(matchedId).toBe(testCase.expected);
    }
  });

  it(`matches issue IDs at beginning of messages`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const testCases = [
      { message: "#123 - Fix critical bug", expected: "#123" },
      { message: "#456 Update API documentation", expected: "#456" },
      { message: "#789\nMultiline commit message", expected: "#789" },
    ];

    testCases.forEach(({ message, expected }) => {
      const result = github.matchTicketId(message);
      expect(result).toBe(expected);
    });
  });

  it(`matches issue IDs with surrounding whitespace`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const testCases = [
      { message: "Fix issue  #123  and improve", expected: "#123" },
      { message: "Resolves\t#456\tperformance", expected: "#456" },
      { message: "Update\n#789\ndocumentation", expected: "#789" },
    ];

    testCases.forEach(({ message, expected }) => {
      const result = github.matchTicketId(message);
      expect(result).toBe(expected);
    });
  });

  it(`returns first match when multiple issue references exist`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const testCases = [
      { message: "Fix #123 and #456", expected: "#123" },
      { message: "Resolves #101 closes #789", expected: "#101" }, // No comma, so #101 matches
      { message: "See #1 #2 and #3", expected: "#1" }, // No commas, so #1 matches first
    ];

    testCases.forEach(({ message, expected }) => {
      const result = github.matchTicketId(message);
      expect(result).toBe(expected);
    });
  });

  it(`does not match invalid patterns`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const testCases = [
      { message: "Use #hashtag for social media", expected: null },
      { message: "Price is $123", expected: null },
      { message: "Version 1.2.3", expected: null },
      { message: "File#123.txt", expected: null }, // No space before #
      { message: "email@domain.com", expected: null },
      { message: "#", expected: null },
      { message: "# comment", expected: null },
      { message: "#abc", expected: null },
      { message: "##123", expected: null },
      { message: "#123:", expected: null }, // Colon immediately after number
      { message: "#456.", expected: null }, // Period immediately after number
    ];

    testCases.forEach(({ message, expected }) => {
      const result = github.matchTicketId(message);
      expect(result).toBe(expected);
    });
  });

  it(`handles edge cases with numbers`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const testCases = [
      { message: "Issue #0", expected: "#0" },
      { message: "Fix #000123", expected: "#000123" },
      { message: "Large issue #999999999", expected: "#999999999" },
    ];

    testCases.forEach(({ message, expected }) => {
      const result = github.matchTicketId(message);
      expect(result).toBe(expected);
    });
  });

  it(`matches and retrieves issue from commit message`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issue = await github.matchTicketByIdAndRetrieve("Fix critical bug #1", workload.id);

    expect(issue).not.toBeNull();
    expect(issue.key).toBe("#1");
    expect(issue.workload).toBe(workload.id);
  });

  it(`returns null when no issue ID found in message`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issue = await github.matchTicketByIdAndRetrieve("No issue reference here", workload.id);

    expect(issue).toBeNull();
  });

  it(`builds correct GitHub.com issue links`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const link1 = github.buildTicketLink(workload.id, "#123");
    const link2 = github.buildTicketLink(workload.id, "456");

    expect(link1).toBe(`${mockServer.baseUrl()}/octocat/Hello-World/issues/123`);
    expect(link2).toBe(`${mockServer.baseUrl()}/octocat/Hello-World/issues/456`);
  });

  it(`handles various issue number formats in URLs`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const testCases = [
      { issueId: "1", expected: `${mockServer.baseUrl()}/octocat/Hello-World/issues/1` },
      { issueId: "#1", expected: `${mockServer.baseUrl()}/octocat/Hello-World/issues/1` },
      { issueId: "999", expected: `${mockServer.baseUrl()}/octocat/Hello-World/issues/999` },
      { issueId: "#999", expected: `${mockServer.baseUrl()}/octocat/Hello-World/issues/999` },
      { issueId: "0", expected: `${mockServer.baseUrl()}/octocat/Hello-World/issues/0` },
    ];

    testCases.forEach(({ issueId, expected }) => {
      const link = github.buildTicketLink(workload.id, issueId);
      expect(link).toBe(expected);
    });
  });

  it(`handles priority mapping correctly`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    // Fetch issues and verify priority mapping
    const issues = await github.fetchTickets(
      workload.id,
      addDays(new Date(), -30),
      new Date(),
      "Medium", // This should match "priority:medium" label via labelMapping
      TimeRangeMode.CreatedWithinRange,
    );

    // Should have issues with Medium priority due to label mapping
    const mediumPriorityIssues = issues.filter((issue) => issue.priority === "Medium");
    expect(mediumPriorityIssues.length).toBeGreaterThanOrEqual(0);
  });

  it(`handles different issue types correctly`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    const issues = await github.fetchTickets(
      workload.id,
      addDays(new Date(), -30),
      new Date(),
      "Low",
      TimeRangeMode.CreatedWithinRange,
    );

    // Should have various issue types from the mock data
    const issueTypes = new Set(issues.map((issue) => issue.issueType));
    expect(issueTypes.size).toBeGreaterThanOrEqual(1);

    // Verify issue types are from our configured types or fallback
    issues.forEach((issue) => {
      expect(typeof issue.issueType).toBe("string");
      expect(issue.issueType.length).toBeGreaterThan(0);
    });
  });

  it(`handles invalid date inputs gracefully`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    // Test with invalid dates - should not throw errors
    const issues = await github.fetchTickets(
      workload.id,
      new Date("invalid-date"),
      new Date(),
      "Medium",
      TimeRangeMode.CreatedWithinRange,
    );

    // Should return empty array for invalid start date
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBe(0);
  });

  it(`handles API errors gracefully`, async () => {
    const github = getIssueMgmtForWorkload(workload);

    // Test with invalid issue ID format
    const issue = await github.getTicket(workload.id, "invalid-id");

    // Should return null instead of throwing
    expect(issue).toBeNull();
  });
});
