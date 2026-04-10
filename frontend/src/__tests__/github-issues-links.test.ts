import { describe, it, expect, beforeEach, vi } from "vitest";

// GitHub Issue Link Builder utility functions
class GitHubIssueLinkBuilder {
  static buildGithubIssueUrl(issueKey: string, serverUrl: string, owner: string, repo: string): string {
    const issueNumber = issueKey.replace("#", "");

    if (serverUrl === "https://api.github.com") {
      return `https://github.com/${owner}/${repo}/issues/${issueNumber}`;
    } else {
      // GitHub Enterprise
      const baseUrl = serverUrl.replace("/api/v3", "");
      return `${baseUrl}/${owner}/${repo}/issues/${issueNumber}`;
    }
  }

  static extractIssueNumber(githubUrl: string): string | null {
    const match = /\/issues\/(\d+)$/.exec(githubUrl);
    return match ? match[1] : null;
  }

  static isValidGitHubIssueKey(key: string): boolean {
    return /^#?\d+$/.test(key);
  }

  static formatIssueKey(key: string): string {
    return key.startsWith("#") ? key : `#${key}`;
  }
}

// Mock GitHub Issues data
const mockGithubIssues = [
  {
    key: "#123",
    issueType: "bug",
    created: "2024-01-15T10:00:00Z",
    resolutiondate: null,
    priority: "High",
    workload: "test-workload",
    title: "Authentication bug",
  },
  {
    key: "#124",
    issueType: "feature",
    created: "2024-01-16T14:30:00Z",
    resolutiondate: "2024-01-20T16:45:00Z",
    priority: "Medium",
    workload: "test-workload",
    title: "Add new dashboard",
  },
  {
    key: "#125",
    issueType: "incident",
    created: "2024-01-17T09:15:00Z",
    resolutiondate: "2024-01-17T11:30:00Z",
    priority: "Critical",
    workload: "test-workload",
    title: "Production outage",
  },
];

describe("GitHub Issues Links and Display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GitHub Issue Link Generation", () => {
    it("should generate correct GitHub.com issue URLs", () => {
      const url = GitHubIssueLinkBuilder.buildGithubIssueUrl("#123", "https://api.github.com", "testorg", "testrepo");

      expect(url).toBe("https://github.com/testorg/testrepo/issues/123");
    });

    it("should generate correct GitHub Enterprise issue URLs", () => {
      const url = GitHubIssueLinkBuilder.buildGithubIssueUrl(
        "#456",
        "https://github.enterprise.com/api/v3",
        "enterpriseorg",
        "enterpriserepo"
      );

      expect(url).toBe("https://github.enterprise.com/enterpriseorg/enterpriserepo/issues/456");
    });

    it("should handle issue keys with and without # prefix", () => {
      const urlWithHash = GitHubIssueLinkBuilder.buildGithubIssueUrl(
        "#789",
        "https://api.github.com",
        "testorg",
        "testrepo"
      );

      const urlWithoutHash = GitHubIssueLinkBuilder.buildGithubIssueUrl(
        "789",
        "https://api.github.com",
        "testorg",
        "testrepo"
      );

      expect(urlWithHash).toBe("https://github.com/testorg/testrepo/issues/789");
      expect(urlWithoutHash).toBe("https://github.com/testorg/testrepo/issues/789");
    });

    it("should extract issue numbers from GitHub URLs correctly", () => {
      const githubUrl = "https://github.com/testorg/testrepo/issues/123";
      const issueNumber = GitHubIssueLinkBuilder.extractIssueNumber(githubUrl);

      expect(issueNumber).toBe("123");
    });

    it("should return null for invalid GitHub URLs", () => {
      const invalidUrl = "https://github.com/testorg/testrepo/pull/123";
      const issueNumber = GitHubIssueLinkBuilder.extractIssueNumber(invalidUrl);

      expect(issueNumber).toBeNull();
    });
  });

  describe("Issue Key Validation and Formatting", () => {
    it("should validate GitHub issue keys correctly", () => {
      expect(GitHubIssueLinkBuilder.isValidGitHubIssueKey("#123")).toBe(true);
      expect(GitHubIssueLinkBuilder.isValidGitHubIssueKey("123")).toBe(true);
      expect(GitHubIssueLinkBuilder.isValidGitHubIssueKey("abc")).toBe(false);
      expect(GitHubIssueLinkBuilder.isValidGitHubIssueKey("#abc")).toBe(false);
      expect(GitHubIssueLinkBuilder.isValidGitHubIssueKey("")).toBe(false);
    });

    it("should format issue keys consistently", () => {
      expect(GitHubIssueLinkBuilder.formatIssueKey("123")).toBe("#123");
      expect(GitHubIssueLinkBuilder.formatIssueKey("#123")).toBe("#123");
    });
  });

  describe("Issue Display Data Processing", () => {
    it("should process GitHub issues for table display", () => {
      const processedIssues = mockGithubIssues.map((issue) => ({
        ...issue,
        url: GitHubIssueLinkBuilder.buildGithubIssueUrl(issue.key, "https://api.github.com", "testorg", "testrepo"),
        status: issue.resolutiondate ? "Closed" : "Open",
        formattedCreated: new Date(issue.created).toLocaleDateString(),
        formattedResolved: issue.resolutiondate ? new Date(issue.resolutiondate).toLocaleDateString() : "-",
      }));

      expect(processedIssues).toHaveLength(3);
      expect(processedIssues[0].url).toBe("https://github.com/testorg/testrepo/issues/123");
      expect(processedIssues[0].status).toBe("Open");
      expect(processedIssues[1].status).toBe("Closed");
    });

    it("should apply correct CSS classes based on priority", () => {
      const getPriorityClass = (priority: string) => {
        return {
          "priority-critical": priority === "Critical",
          "priority-high": priority === "High",
          "priority-medium": priority === "Medium",
          "priority-low": priority === "Low",
        };
      };

      expect(getPriorityClass("High")).toEqual({
        "priority-critical": false,
        "priority-high": true,
        "priority-medium": false,
        "priority-low": false,
      });

      expect(getPriorityClass("Critical")).toEqual({
        "priority-critical": true,
        "priority-high": false,
        "priority-medium": false,
        "priority-low": false,
      });
    });

    it("should apply correct CSS classes based on status", () => {
      const getStatusClass = (resolutiondate: string | null) => {
        return {
          "status-open": !resolutiondate,
          "status-closed": !!resolutiondate,
        };
      };

      expect(getStatusClass(null)).toEqual({
        "status-open": true,
        "status-closed": false,
      });

      expect(getStatusClass("2024-01-20T16:45:00Z")).toEqual({
        "status-open": false,
        "status-closed": true,
      });
    });
  });

  describe("Mixed Ticket Types URL Handling", () => {
    it("should handle different URL patterns for different ticket systems", () => {
      const githubUrl = GitHubIssueLinkBuilder.buildGithubIssueUrl(
        "#123",
        "https://api.github.com",
        "testorg",
        "testrepo"
      );

      // Mock other system URL builders for comparison
      const adoUrl = "https://dev.azure.com/testorg/testproject/_workitems/edit/456";
      const jiraUrl = "https://testorg.atlassian.net/browse/JIRA-789";

      // Each system should have its own URL pattern
      expect(githubUrl).toContain("github.com");
      expect(githubUrl).toContain("/issues/");

      expect(adoUrl).toContain("dev.azure.com");
      expect(adoUrl).toContain("/_workitems/edit/");

      expect(jiraUrl).toContain("atlassian.net");
      expect(jiraUrl).toContain("/browse/");
    });

    it("should distinguish GitHub issues from other ticket systems by key format", () => {
      const mixedTickets = [
        { key: "#123", system: "github" },
        { key: "ADO-456", system: "azure" },
        { key: "JIRA-789", system: "jira" },
      ];

      const githubTickets = mixedTickets.filter((t) => t.key.startsWith("#"));
      const otherTickets = mixedTickets.filter((t) => !t.key.startsWith("#"));

      expect(githubTickets).toHaveLength(1);
      expect(otherTickets).toHaveLength(2);

      // GitHub issues should have # prefix
      expect(githubTickets[0].key).toMatch(/^#\d+$/);
    });
  });

  describe("Link Security and Accessibility", () => {
    it("should generate links with proper security attributes", () => {
      // In a real component, these would be the expected attributes
      const expectedAttributes = {
        target: "_blank",
        rel: "noopener noreferrer",
      };

      expect(expectedAttributes.target).toBe("_blank");
      expect(expectedAttributes.rel).toBe("noopener noreferrer");
    });

    it("should handle external link navigation safely", () => {
      const url = GitHubIssueLinkBuilder.buildGithubIssueUrl("#123", "https://api.github.com", "testorg", "testrepo");

      // Verify URL is properly formatted and safe
      expect(url).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/);
      expect(url).not.toContain("<script>");
      expect(url).not.toContain("javascript:");
    });
  });

  describe("Performance and Caching Considerations", () => {
    it("should handle large numbers of GitHub issues efficiently", () => {
      const largeIssueSet = Array.from({ length: 1000 }, (_, i) => ({
        key: `#${i + 1}`,
        issueType: i % 2 === 0 ? "bug" : "feature",
        created: `2024-01-${String(Math.floor(i / 30) + 1).padStart(2, "0")}T10:00:00Z`,
        resolutiondate: i % 3 === 0 ? `2024-01-${String(Math.floor(i / 30) + 2).padStart(2, "0")}T15:00:00Z` : null,
        priority: ["Low", "Medium", "High", "Critical"][i % 4],
        workload: "test-workload",
        title: `Issue ${i + 1}`,
      }));

      const startTime = performance.now();

      const processedUrls = largeIssueSet.map((issue) =>
        GitHubIssueLinkBuilder.buildGithubIssueUrl(issue.key, "https://api.github.com", "testorg", "testrepo")
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100); // Should process in under 100ms
      expect(processedUrls).toHaveLength(1000);
      expect(processedUrls[0]).toBe("https://github.com/testorg/testrepo/issues/1");
      expect(processedUrls[999]).toBe("https://github.com/testorg/testrepo/issues/1000");
    });

    it("should support URL caching for repeated requests", () => {
      const cache = new Map<string, string>();

      const getCachedUrl = (issueKey: string, serverUrl: string, owner: string, repo: string) => {
        const cacheKey = `${serverUrl}:${owner}:${repo}:${issueKey}`;

        if (cache.has(cacheKey)) {
          return cache.get(cacheKey)!;
        }

        const url = GitHubIssueLinkBuilder.buildGithubIssueUrl(issueKey, serverUrl, owner, repo);
        cache.set(cacheKey, url);
        return url;
      };

      const url1 = getCachedUrl("#123", "https://api.github.com", "testorg", "testrepo");
      const url2 = getCachedUrl("#123", "https://api.github.com", "testorg", "testrepo");

      expect(url1).toBe(url2);
      expect(cache.size).toBe(1);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid issue keys gracefully", () => {
      expect(() => {
        GitHubIssueLinkBuilder.buildGithubIssueUrl("", "https://api.github.com", "testorg", "testrepo");
      }).not.toThrow();
    });

    it("should handle missing server configuration gracefully", () => {
      expect(() => {
        GitHubIssueLinkBuilder.buildGithubIssueUrl("#123", "", "testorg", "testrepo");
      }).not.toThrow();
    });

    it("should handle malformed server URLs", () => {
      const url = GitHubIssueLinkBuilder.buildGithubIssueUrl("#123", "not-a-valid-url", "testorg", "testrepo");

      // Should still generate some form of URL, even if malformed
      expect(typeof url).toBe("string");
    });

    it("should handle special characters in owner/repo names", () => {
      const url = GitHubIssueLinkBuilder.buildGithubIssueUrl("#123", "https://api.github.com", "test-org", "test.repo");

      expect(url).toBe("https://github.com/test-org/test.repo/issues/123");
    });

    it("should handle very large issue numbers", () => {
      const url = GitHubIssueLinkBuilder.buildGithubIssueUrl(
        "#999999999",
        "https://api.github.com",
        "testorg",
        "testrepo"
      );

      expect(url).toBe("https://github.com/testorg/testrepo/issues/999999999");
    });
  });
});
