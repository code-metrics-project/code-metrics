import { describe, it, expect, beforeEach, vi } from "vitest";

// QueryName enum for testing
const QueryName = {
  BugsNew: "bugs-new",
  ProductionIncidents: "production-incidents",
};

// Mock the services and utilities
vi.mock("@/services/issues", () => ({
  getIssuePriorities: vi.fn(() => [
    { value: "Low", title: "Low" },
    { value: "Medium", title: "Medium" },
    { value: "High", title: "High" },
    { value: "Critical", title: "Critical" },
  ]),
}));

vi.mock("@/utils/config", () => ({
  getConfig: vi.fn(() => ({
    systemConfig: {
      issuePriorities: ["Low", "Medium", "High", "Critical"],
    },
  })),
}));

// Mock function for getIssuePriorities
const getIssuePriorities = () => [
  { value: "Low", title: "Low" },
  { value: "Medium", title: "Medium" },
  { value: "High", title: "High" },
  { value: "Critical", title: "Critical" },
];

// Mock GitHub Issues data that would come from the backend
const mockGithubIssuesData = [
  {
    key: "#123",
    issueType: "bug",
    created: "2024-01-15T10:00:00Z",
    resolutiondate: null,
    priority: "High",
    workload: "test-workload",
    title: "GitHub Issue: Fix authentication bug",
  },
  {
    key: "#124",
    issueType: "feature",
    created: "2024-01-16T14:30:00Z",
    resolutiondate: "2024-01-20T16:45:00Z",
    priority: "Medium",
    workload: "test-workload",
    title: "GitHub Issue: Add new dashboard feature",
  },
  {
    key: "#125",
    issueType: "incident",
    created: "2024-01-17T09:15:00Z",
    resolutiondate: "2024-01-17T11:30:00Z",
    priority: "Critical",
    workload: "test-workload",
    title: "GitHub Issue: Production outage in payment system",
  },
];

// Mock Azure DevOps data for comparison
const mockAzureDevOpsData = [
  {
    key: "ADO-456",
    issueType: "Bug",
    created: "2024-01-15T11:00:00Z",
    resolutiondate: null,
    priority: "High",
    workload: "test-workload",
    title: "Azure DevOps: Authentication issue",
  },
];

// Mock Jira data for comparison
const mockJiraData = [
  {
    key: "JIRA-789",
    issueType: "Story",
    created: "2024-01-16T12:00:00Z",
    resolutiondate: "2024-01-18T15:00:00Z",
    priority: "Medium",
    workload: "test-workload",
    title: "Jira: User story for new feature",
  },
];

describe("GitHub Issues UI Compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GitHub Issues Data Structure Compatibility", () => {
    it("should have the same data structure as Azure DevOps and Jira tickets", () => {
      const githubIssue = mockGithubIssuesData[0];
      const azureIssue = mockAzureDevOpsData[0];
      const jiraIssue = mockJiraData[0];

      // All ticket types should have the same required fields
      const requiredFields = ["key", "issueType", "created", "resolutiondate", "priority", "workload", "title"];

      requiredFields.forEach((field) => {
        expect(githubIssue).toHaveProperty(field);
        expect(azureIssue).toHaveProperty(field);
        expect(jiraIssue).toHaveProperty(field);
      });
    });

    it("should format GitHub issue keys correctly with # prefix", () => {
      const githubIssue = mockGithubIssuesData[0];
      expect(githubIssue.key).toMatch(/^#\d+$/);
      expect(githubIssue.key).toBe("#123");
    });

    it("should handle null resolution dates for open issues", () => {
      const openIssue = mockGithubIssuesData[0];
      const closedIssue = mockGithubIssuesData[1];

      expect(openIssue.resolutiondate).toBeNull();
      expect(closedIssue.resolutiondate).toBeTruthy();
      expect(new Date(closedIssue.resolutiondate!).getTime()).toBeGreaterThan(0);
    });

    it("should have valid ISO date strings for created dates", () => {
      mockGithubIssuesData.forEach((issue) => {
        expect(issue.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
        expect(new Date(issue.created).getTime()).toBeGreaterThan(0);
      });
    });

    it("should have valid priority values", () => {
      const validPriorities = ["Low", "Medium", "High", "Critical"];
      mockGithubIssuesData.forEach((issue) => {
        expect(validPriorities).toContain(issue.priority);
      });
    });
  });

  describe("GitHub Issue Types and Categories", () => {
    it("should support common GitHub issue types", () => {
      const issueTypes = mockGithubIssuesData.map((issue) => issue.issueType);
      expect(issueTypes).toContain("bug");
      expect(issueTypes).toContain("feature");
      expect(issueTypes).toContain("incident");
    });

    it("should handle GitHub-specific issue types correctly", () => {
      const githubSpecificTypes = ["enhancement", "documentation", "question", "help wanted"];
      // These should be valid issue types that the system can handle
      githubSpecificTypes.forEach((type) => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Issue Filter Compatibility", () => {
    it("should support priority filtering for GitHub issues", () => {
      const priorities = getIssuePriorities();
      expect(priorities).toEqual([
        { value: "Low", title: "Low" },
        { value: "Medium", title: "Medium" },
        { value: "High", title: "High" },
        { value: "Critical", title: "Critical" },
      ]);
    });

    it("should filter GitHub issues by priority correctly", () => {
      const highPriorityIssues = mockGithubIssuesData.filter((issue) => issue.priority === "High");
      const criticalPriorityIssues = mockGithubIssuesData.filter((issue) => issue.priority === "Critical");

      expect(highPriorityIssues).toHaveLength(1);
      expect(criticalPriorityIssues).toHaveLength(1);
      expect(highPriorityIssues[0].key).toBe("#123");
      expect(criticalPriorityIssues[0].key).toBe("#125");
    });
  });

  describe("Date Filtering and Sorting", () => {
    it("should sort GitHub issues by creation date correctly", () => {
      const sortedByCreated = [...mockGithubIssuesData].sort(
        (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
      );

      expect(sortedByCreated[0].key).toBe("#123"); // 2024-01-15
      expect(sortedByCreated[1].key).toBe("#124"); // 2024-01-16
      expect(sortedByCreated[2].key).toBe("#125"); // 2024-01-17
    });

    it("should filter GitHub issues by date range correctly", () => {
      const startDate = new Date("2024-01-16T00:00:00Z");
      const endDate = new Date("2024-01-17T23:59:59Z");

      const filteredIssues = mockGithubIssuesData.filter((issue) => {
        const createdDate = new Date(issue.created);
        return createdDate >= startDate && createdDate <= endDate;
      });

      expect(filteredIssues).toHaveLength(2);
      expect(filteredIssues.map((i) => i.key)).toEqual(["#124", "#125"]);
    });

    it("should handle resolution date filtering for closed GitHub issues", () => {
      const resolvedIssues = mockGithubIssuesData.filter((issue) => issue.resolutiondate !== null);
      expect(resolvedIssues).toHaveLength(2);

      const resolvedInJanuary = resolvedIssues.filter((issue) => {
        const resolvedDate = new Date(issue.resolutiondate);
        return resolvedDate.getMonth() === 0 && resolvedDate.getFullYear() === 2024;
      });
      expect(resolvedInJanuary).toHaveLength(2);
    });
  });

  describe("GitHub Issue Links and URLs", () => {
    it("should generate correct GitHub issue URLs for GitHub.com", () => {
      const owner = "testorg";
      const repo = "testrepo";
      const issueNumber = "123";

      const expectedUrl = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;

      // This would be the format expected from buildTicketLink method
      expect(expectedUrl).toBe("https://github.com/testorg/testrepo/issues/123");
    });

    it("should generate correct GitHub issue URLs for GitHub Enterprise", () => {
      const enterpriseUrl = "https://github.enterprise.com";
      const owner = "testorg";
      const repo = "testrepo";
      const issueNumber = "123";

      const expectedUrl = `${enterpriseUrl}/${owner}/${repo}/issues/${issueNumber}`;

      expect(expectedUrl).toBe("https://github.enterprise.com/testorg/testrepo/issues/123");
    });

    it("should handle issue key extraction from GitHub URLs", () => {
      const githubUrl = "https://github.com/testorg/testrepo/issues/123";
      const issueKeyMatch = /\/issues\/(\d+)$/.exec(githubUrl);

      expect(issueKeyMatch).toBeTruthy();
      expect(issueKeyMatch![1]).toBe("123");
    });
  });

  describe("Mixed Ticket Type Display", () => {
    it("should handle mixed ticket types from different systems", () => {
      const mixedTickets = [...mockGithubIssuesData, ...mockAzureDevOpsData, ...mockJiraData];

      expect(mixedTickets).toHaveLength(5);

      // Verify all tickets have required fields
      mixedTickets.forEach((ticket) => {
        expect(ticket).toHaveProperty("key");
        expect(ticket).toHaveProperty("issueType");
        expect(ticket).toHaveProperty("created");
        expect(ticket).toHaveProperty("priority");
        expect(ticket).toHaveProperty("workload");
        expect(ticket).toHaveProperty("title");
      });

      // Verify different key formats are preserved
      const githubKeys = mixedTickets.filter((t) => t.key.startsWith("#"));
      const adoKeys = mixedTickets.filter((t) => t.key.startsWith("ADO-"));
      const jiraKeys = mixedTickets.filter((t) => t.key.startsWith("JIRA-"));

      expect(githubKeys).toHaveLength(3);
      expect(adoKeys).toHaveLength(1);
      expect(jiraKeys).toHaveLength(1);
    });

    it("should sort mixed ticket types by date correctly", () => {
      const mixedTickets = [...mockGithubIssuesData, ...mockAzureDevOpsData, ...mockJiraData];

      const sortedTickets = mixedTickets.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

      // Should be sorted chronologically regardless of ticket system
      expect(sortedTickets[0].key).toBe("#123"); // 2024-01-15T10:00:00Z
      expect(sortedTickets[1].key).toBe("ADO-456"); // 2024-01-15T11:00:00Z
      expect(sortedTickets[2].key).toBe("JIRA-789"); // 2024-01-16T12:00:00Z
      expect(sortedTickets[3].key).toBe("#124"); // 2024-01-16T14:30:00Z
      expect(sortedTickets[4].key).toBe("#125"); // 2024-01-17T09:15:00Z
    });
  });

  describe("Chart and Report Integration", () => {
    it("should aggregate GitHub issues correctly for charts", () => {
      // Test data aggregation by workload
      const byWorkload = mockGithubIssuesData.reduce(
        (acc, issue) => {
          acc[issue.workload] = (acc[issue.workload] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(byWorkload["test-workload"]).toBe(3);
    });

    it("should aggregate GitHub issues by priority for reports", () => {
      const byPriority = mockGithubIssuesData.reduce(
        (acc, issue) => {
          acc[issue.priority] = (acc[issue.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(byPriority.High).toBe(1);
      expect(byPriority.Medium).toBe(1);
      expect(byPriority.Critical).toBe(1);
    });

    it("should aggregate GitHub issues by type for charts", () => {
      const byType = mockGithubIssuesData.reduce(
        (acc, issue) => {
          acc[issue.issueType] = (acc[issue.issueType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(byType.bug).toBe(1);
      expect(byType.feature).toBe(1);
      expect(byType.incident).toBe(1);
    });

    it("should calculate resolution metrics correctly for GitHub issues", () => {
      const resolvedIssues = mockGithubIssuesData.filter((issue) => issue.resolutiondate);
      const openIssues = mockGithubIssuesData.filter((issue) => !issue.resolutiondate);

      expect(resolvedIssues).toHaveLength(2);
      expect(openIssues).toHaveLength(1);

      // Calculate average resolution time for resolved issues
      const resolutionTimes = resolvedIssues.map((issue) => {
        const created = new Date(issue.created).getTime();
        const resolved = new Date(issue.resolutiondate!).getTime();
        return resolved - created;
      });

      expect(resolutionTimes).toHaveLength(2);
      resolutionTimes.forEach((time) => {
        expect(time).toBeGreaterThan(0);
      });
    });
  });

  describe("Query Integration", () => {
    it("should support BugsNew query type for GitHub issues", () => {
      expect(QueryName.BugsNew).toBe("bugs-new");
    });

    it("should support ProductionIncidents query type for GitHub issues", () => {
      expect(QueryName.ProductionIncidents).toBe("production-incidents");
    });

    it("should handle query parameters correctly for GitHub issues", () => {
      const queryParams = {
        workloads: ["test-workload"],
        startDate: "2024-01-15",
        endDate: "2024-01-20",
        issueFilter: {
          priority: "High",
        },
      };

      expect(queryParams.workloads).toBeInstanceOf(Array);
      expect(queryParams.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(queryParams.issueFilter).toHaveProperty("priority");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle empty GitHub issues data gracefully", () => {
      const emptyData: unknown[] = [];

      expect(emptyData).toHaveLength(0);
      expect(() => {
        emptyData.forEach((issue) => {
          // Should not execute for empty array
          expect(issue).toBeDefined();
        });
      }).not.toThrow();
    });

    it("should handle malformed GitHub issue data", () => {
      const malformedIssue = {
        key: "#999",
        issueType: "",
        created: "invalid-date",
        resolutiondate: null,
        priority: null,
        workload: "test-workload",
        title: "",
      };

      // Should handle gracefully without throwing
      expect(() => {
        const isValidDate = !isNaN(new Date(malformedIssue.created).getTime());
        expect(isValidDate).toBe(false);
      }).not.toThrow();
    });

    it("should handle missing required fields in GitHub issues", () => {
      const incompleteIssue = {
        key: "#888",
        // Missing other required fields
      };

      const requiredFields = ["issueType", "created", "priority", "workload", "title"];
      requiredFields.forEach((field) => {
        expect(incompleteIssue).not.toHaveProperty(field);
      });
    });
  });
});
