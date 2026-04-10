/**
 * @group unit
 */

import { expect, jest, describe, it, beforeEach } from "@jest/globals";
import { GithubTicketService } from "../github";
import { TimeRangeMode } from "../ticketService";

// Mock the datastore factory
jest.mock("../../../db/factory", () => ({
  initDatastore: jest.fn().mockResolvedValue({}),
  provideDatastore: jest.fn().mockReturnValue({
    findOrInsertOneDated: jest.fn(),
    findOrInsertOne: jest.fn(),
  }),
}));

// Mock config mapping
jest.mock("../../../config/configMapping", () => ({
  getWorkloadById: jest.fn(),
  getAllTicketManagementConfig: jest.fn(),
}));

// Mock Octokit
jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => {
    const mockAsyncIterator = async function* () {
      yield {
        data: [],
      };
    };

    return {
      issues: {
        listForRepo: jest.fn(),
        get: jest.fn(),
      },
      paginate: {
        iterator: jest.fn().mockImplementation(() => mockAsyncIterator()),
      },
      request: jest.fn().mockResolvedValue({ data: [] }),
    };
  }),
}));

describe("GithubTicketService Unit Tests", () => {
  let service: GithubTicketService;
  let mockConfigManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock config manager
    mockConfigManager = {
      getDefaultTicketTypes: jest.fn(() => ["Bug"]),
      getWorkloadConfig: jest.fn(() => ({
        type: "github",
        serverId: "test-github",
        owner: "octocat",
        repo: "hello-world",
        ticketTypes: ["bug", "enhancement", "feature"],
        ticketPriorities: ["priority:low", "priority:medium", "priority:high"],
        stateFilter: "all",
        labelMapping: {
          "priority:low": "Low",
          "priority:medium": "Medium",
          "priority:high": "High",
        },
      })),
      getServerDefaults: jest.fn(),
      getServerConfig: jest.fn(),
    };

    service = new GithubTicketService(mockConfigManager);
  });

  describe("matchTicketId", () => {
    it("should extract GitHub issue ID from message", () => {
      const testCases = [
        { message: "Fix issue #123", expected: "#123" },
        { message: "Resolves #456 and #789", expected: "#456" },
        { message: "Issue #1 is fixed", expected: "#1" },
        { message: " #999 ", expected: "#999" },
        { message: "No issue here", expected: null },
        { message: "Issue 123 without #", expected: null },
        { message: "", expected: null },
      ];

      testCases.forEach(({ message, expected }) => {
        const result = service.matchTicketId(message);
        expect(result).toBe(expected);
      });
    });

    it("should return null for null message", () => {
      const result = service.matchTicketId(null as any);
      expect(result).toBeNull();
    });

    it("should handle messages with multiple issue references", () => {
      const result = service.matchTicketId("Fixes #123 and closes #456");
      expect(result).toBe("#123");
    });

    it("should handle edge cases with whitespace", () => {
      expect(service.matchTicketId("  #42  ")).toBe("#42");
      expect(service.matchTicketId("\n#123\n")).toBe("#123");
    });
  });

  describe("buildTicketLink", () => {
    beforeEach(() => {
      const configMapping = require("../../../config/configMapping");
      configMapping.getWorkloadById.mockReturnValue({
        id: "test-workload",
        projectManagement: {
          type: "github",
          serverId: "test-github",
        },
      });
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-github",
              url: "https://api.github.com",
              apiKey: "test-token",
            },
          ],
        },
      });
    });

    it("should build correct URL for GitHub.com", () => {
      const result = service.buildTicketLink("test-workload", "123");
      expect(result).toBe("https://github.com/octocat/hello-world/issues/123");
    });

    it("should build correct URL with # prefix", () => {
      const result = service.buildTicketLink("test-workload", "#123");
      expect(result).toBe("https://github.com/octocat/hello-world/issues/123");
    });

    it("should handle GitHub Enterprise URLs", () => {
      const configMapping = require("../../../config/configMapping");
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-github",
              url: "https://github.enterprise.com/api/v3",
            },
          ],
        },
      });

      const result = service.buildTicketLink("test-workload", "123");
      expect(result).toBe("https://github.enterprise.com/octocat/hello-world/issues/123");
    });

    it("should return empty string for missing server config", () => {
      const configMapping = require("../../../config/configMapping");
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [],
        },
      });

      const result = service.buildTicketLink("test-workload", "123");
      expect(result).toBe("");
    });
  });

  describe("Configuration Validation", () => {
    it("should handle missing workload configuration", () => {
      // Mock getWorkloadById to return a valid workload but with null config from configManager
      const configMapping = require("../../../config/configMapping");
      configMapping.getWorkloadById.mockReturnValue({
        projectManagement: { serverId: "test-server" },
      });
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-server",
              url: "https://api.github.com",
            },
          ],
        },
      });

      // Create a new service instance with null config to test the error
      const nullConfigManager = {
        ...mockConfigManager,
        getWorkloadConfig: jest.fn(() => null),
      };
      const testService = new GithubTicketService(nullConfigManager);

      expect(() => {
        testService.buildTicketLink("invalid-workload", "123");
      }).toThrow("No GitHub configuration found for workload: invalid-workload");
    });

    it("should work with valid configuration", () => {
      expect(service).toBeInstanceOf(GithubTicketService);

      // Call a method that uses the config to verify it works
      const configMapping = require("../../../config/configMapping");
      configMapping.getWorkloadById.mockReturnValue({
        projectManagement: { serverId: "test-github" },
      });
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-github",
              url: "https://api.github.com",
            },
          ],
        },
      });

      const result = service.buildTicketLink("test-workload", "123");
      expect(result).toBe("https://github.com/octocat/hello-world/issues/123");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid date inputs gracefully", async () => {
      const invalidDate = new Date("invalid");
      const validDate = new Date("2023-01-31");

      const { provideDatastore } = require("../../../db/factory");
      const mockDatastore = provideDatastore();
      mockDatastore.findOrInsertOneDated.mockResolvedValue({ issues: [] });

      const result = await service.fetchTickets(
        "test-workload",
        invalidDate,
        validDate,
        "Medium",
        TimeRangeMode.CreatedWithinRange,
      );

      expect(result).toEqual([]);
    });

    it("should handle invalid issue IDs gracefully", async () => {
      const { provideDatastore } = require("../../../db/factory");
      const mockDatastore = provideDatastore();
      mockDatastore.findOrInsertOne.mockImplementation((_, __, callback) => {
        return callback().then((result) => ({ ticket: result.ticket }));
      });

      const result = await service.getTicket("test-workload", "invalid");
      expect(result).toBeNull();
    });
  });

  describe("Date Filtering", () => {
    beforeEach(() => {
      const { provideDatastore } = require("../../../db/factory");
      const mockDatastore = provideDatastore();
      mockDatastore.findOrInsertOneDated.mockImplementation((_, __, ___, callback) => {
        return callback().then((result) => ({ issues: result.issues }));
      });

      const { Octokit } = require("@octokit/rest");
      const mockOctokit = new Octokit();

      const mockAsyncIterator = async function* () {
        yield {
          data: [
            {
              number: 1,
              title: "Test Issue",
              state: "open",
              created_at: "2023-01-15T00:00:00Z",
              closed_at: null,
              labels: [{ name: "bug" }],
              html_url: "https://github.com/octocat/hello-world/issues/1",
            },
          ],
        };
      };

      // Mock paginate.iterator to return a new async iterator each time it's called
      mockOctokit.paginate.iterator.mockImplementation(() => mockAsyncIterator());
      mockOctokit.request.mockRejectedValue(new Error("Not found"));

      const configMapping = require("../../../config/configMapping");
      configMapping.getWorkloadById.mockReturnValue({
        projectManagement: { serverId: "test-github" },
      });
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-github",
              url: "https://api.github.com",
              apiKey: "test-token",
            },
          ],
        },
      });

      // Recreate service to pick up new mocks
      service = new GithubTicketService(mockConfigManager);
    });

    it("should handle CreatedWithinRange time range mode", async () => {
      const startDate = new Date("2023-01-01");
      const endDate = new Date("2023-01-31");

      const result = await service.fetchTickets(
        "test-workload",
        startDate,
        endDate,
        "Medium",
        TimeRangeMode.CreatedWithinRange,
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle ResolvedWithinRange time range mode", async () => {
      const startDate = new Date("2023-01-01");
      const endDate = new Date("2023-01-31");

      const result = await service.fetchTickets(
        "test-workload",
        startDate,
        endDate,
        "Medium",
        TimeRangeMode.ResolvedWithinRange,
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Priority Mapping", () => {
    it("should handle priority filtering", async () => {
      const { provideDatastore } = require("../../../db/factory");
      const mockDatastore = provideDatastore();
      mockDatastore.findOrInsertOneDated.mockImplementation((_, __, ___, callback) => {
        return callback().then((result) => ({ issues: result.issues }));
      });

      const { Octokit } = require("@octokit/rest");
      const mockOctokit = new Octokit();

      const mockAsyncIterator = async function* () {
        yield {
          data: [
            {
              number: 1,
              title: "High Priority Issue",
              state: "open",
              created_at: "2023-01-15T00:00:00Z",
              closed_at: null,
              labels: [{ name: "bug" }, { name: "priority:high" }],
              html_url: "https://github.com/octocat/hello-world/issues/1",
            },
          ],
        };
      };

      mockOctokit.paginate.iterator.mockImplementation(() => mockAsyncIterator());
      mockOctokit.request.mockRejectedValue(new Error("Not found"));

      const configMapping = require("../../../config/configMapping");
      configMapping.getWorkloadById.mockReturnValue({
        projectManagement: { serverId: "test-github" },
      });
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-github",
              url: "https://api.github.com",
              apiKey: "test-token",
            },
          ],
        },
      });

      // Recreate service to pick up new mocks
      service = new GithubTicketService(mockConfigManager);

      const result = await service.fetchTickets(
        "test-workload",
        new Date("2023-01-01"),
        new Date("2023-01-31"),
        "High",
        TimeRangeMode.CreatedWithinRange,
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getAllTicketIds", () => {
    it("should return empty array for null workload", async () => {
      const result = await service.getAllTicketIds(null as any, 30);
      expect(result).toEqual([]);
    });

    it("should handle valid workload", async () => {
      const { provideDatastore } = require("../../../db/factory");
      const mockDatastore = provideDatastore();
      mockDatastore.findOrInsertOne.mockImplementation((_, __, callback) => {
        return callback().then((result) => ({ ids: result.ids }));
      });

      const { Octokit } = require("@octokit/rest");
      const mockOctokit = new Octokit();

      const mockAsyncIterator = async function* () {
        yield {
          data: [{ number: 1 }, { number: 2 }],
        };
      };

      mockOctokit.paginate.iterator.mockImplementation(() => mockAsyncIterator());

      const configMapping = require("../../../config/configMapping");
      configMapping.getWorkloadById.mockReturnValue({
        projectManagement: { serverId: "test-github" },
      });
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-github",
              url: "https://api.github.com",
              apiKey: "test-token",
            },
          ],
        },
      });

      const mockWorkload = {
        id: "test-workload",
        projectManagement: {
          type: "github",
          serverId: "test-github",
        },
      };

      // Recreate service to pick up new mocks
      service = new GithubTicketService(mockConfigManager);

      const result = await service.getAllTicketIds(mockWorkload as any, 30);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should accept custom issue types parameter", async () => {
      const { provideDatastore } = require("../../../db/factory");
      const mockDatastore = provideDatastore();
      mockDatastore.findOrInsertOne.mockImplementation((_, __, callback) => {
        return callback().then((result) => ({ ids: result.ids }));
      });

      const { Octokit } = require("@octokit/rest");
      const mockOctokit = new Octokit();

      const mockAsyncIterator = async function* () {
        yield {
          data: [{ number: 1 }, { number: 2 }],
        };
      };

      mockOctokit.paginate.iterator.mockImplementation(() => mockAsyncIterator());

      const configMapping = require("../../../config/configMapping");
      configMapping.getWorkloadById.mockReturnValue({
        projectManagement: { serverId: "test-github" },
      });
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-github",
              url: "https://api.github.com",
              apiKey: "test-token",
            },
          ],
        },
      });

      const mockWorkload = {
        id: "test-workload",
        projectManagement: {
          type: "github",
          serverId: "test-github",
        },
      };

      // Recreate service to pick up new mocks
      service = new GithubTicketService(mockConfigManager);

      // Call with custom issue types
      const result = await service.getAllTicketIds(mockWorkload as any, 30, ["bug", "defect"]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should use default ticket types when issueTypes is empty array", async () => {
      const { provideDatastore } = require("../../../db/factory");
      const mockDatastore = provideDatastore();
      mockDatastore.findOrInsertOne.mockImplementation((_, __, callback) => {
        return callback().then((result) => ({ ids: result.ids }));
      });

      const { Octokit } = require("@octokit/rest");
      const mockOctokit = new Octokit();

      const mockAsyncIterator = async function* () {
        yield {
          data: [{ number: 1 }],
        };
      };

      mockOctokit.paginate.iterator.mockImplementation(() => mockAsyncIterator());

      const configMapping = require("../../../config/configMapping");
      configMapping.getWorkloadById.mockReturnValue({
        projectManagement: { serverId: "test-github" },
      });
      configMapping.getAllTicketManagementConfig.mockReturnValue({
        github: {
          servers: [
            {
              id: "test-github",
              url: "https://api.github.com",
              apiKey: "test-token",
            },
          ],
        },
      });

      const mockWorkload = {
        id: "test-workload",
        projectManagement: {
          type: "github",
          serverId: "test-github",
        },
      };

      // Recreate service to pick up new mocks
      service = new GithubTicketService(mockConfigManager);

      // Call with empty issue types - should use defaults from config
      const result = await service.getAllTicketIds(mockWorkload as any, 30, []);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("matchTicketByIdAndRetrieve", () => {
    it("should return null for null message", async () => {
      const result = await service.matchTicketByIdAndRetrieve(null, "test-workload");
      expect(result).toBeNull();
    });

    it("should return null when no ticket ID found", async () => {
      const result = await service.matchTicketByIdAndRetrieve("No issue here", "test-workload");
      expect(result).toBeNull();
    });
  });
});
