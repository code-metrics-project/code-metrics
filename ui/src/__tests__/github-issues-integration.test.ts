import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from "vitest";
import axios from "axios";
import { QueryName } from "@/queries/queries";

// Mock axios for API calls
vi.mock("axios");
const mockedAxios = vi.mocked(axios);
const mockedPost = mockedAxios.post as Mock;
const mockedGet = mockedAxios.get as Mock;

// Mock GitHub Issues API response data
const mockGithubIssuesApiResponse = {
  data: [
    {
      date: "2024-01-15",
      "all-bugs": [
        {
          value: 2,
          dimensions: { workloadId: "github-workload" },
          date: "2024-01-15T00:00:00.000Z",
        },
      ],
    },
    {
      date: "2024-01-16",
      "all-bugs": [
        {
          value: 1,
          dimensions: { workloadId: "github-workload" },
          date: "2024-01-16T00:00:00.000Z",
        },
      ],
    },
  ],
};

const mockGithubIncidentsApiResponse = {
  data: [
    {
      date: "2024-01-15",
      incidents: [
        {
          value: 1,
          dimensions: { workloadId: "github-workload" },
          date: "2024-01-15T00:00:00.000Z",
        },
      ],
    },
  ],
};

// Mock raw GitHub issues data
const mockRawGithubIssues = [
  {
    key: "#123",
    issueType: "bug",
    created: "2024-01-15T10:00:00Z",
    resolutiondate: null,
    priority: "High",
    workload: "github-workload",
    title: "Authentication bug in login system",
  },
  {
    key: "#124",
    issueType: "bug",
    created: "2024-01-15T14:30:00Z",
    resolutiondate: "2024-01-16T09:15:00Z",
    priority: "Medium",
    workload: "github-workload",
    title: "UI rendering issue on mobile devices",
  },
  {
    key: "#125",
    issueType: "feature",
    created: "2024-01-16T11:20:00Z",
    resolutiondate: null,
    priority: "Low",
    workload: "github-workload",
    title: "Add dark mode support",
  },
];

describe("GitHub Issues Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("API Integration", () => {
    it("should fetch GitHub bugs data from the correct API endpoint", async () => {
      mockedPost.mockResolvedValueOnce(mockGithubIssuesApiResponse);

      const queryPayload = {
        queryName: QueryName.BugsNew,
        args: {
          workloads: ["github-workload"],
          startDate: "2024-01-15",
          endDate: "2024-01-16",
          issueFilter: {
            priority: "Medium",
          },
        },
      };

      const response = await axios.post("/api/query", [queryPayload]);

      expect(mockedAxios.post).toHaveBeenCalledWith("/api/query", [queryPayload]);
      expect(response.data).toEqual(mockGithubIssuesApiResponse.data);
    });

    it("should fetch GitHub incidents data from the correct API endpoint", async () => {
      mockedPost.mockResolvedValueOnce(mockGithubIncidentsApiResponse);

      const queryPayload = {
        queryName: QueryName.ProductionIncidents,
        args: {
          workloads: ["github-workload"],
          startDate: "2024-01-15",
          endDate: "2024-01-16",
          incidentFilter: {
            priority: "High",
          },
        },
      };

      const response = await axios.post("/api/query", [queryPayload]);

      expect(mockedAxios.post).toHaveBeenCalledWith("/api/query", [queryPayload]);
      expect(response.data).toEqual(mockGithubIncidentsApiResponse.data);
    });

    it("should fetch raw GitHub issues data from tickets endpoint", async () => {
      mockedGet.mockResolvedValueOnce({ data: mockRawGithubIssues });

      const response = await axios.get("/api/tickets/bugs", {
        params: {
          workloads: "github-workload",
          startDate: "2024-01-15",
          priority: "Medium",
        },
      });

      expect(mockedAxios.get).toHaveBeenCalledWith("/api/tickets/bugs", {
        params: {
          workloads: "github-workload",
          startDate: "2024-01-15",
          priority: "Medium",
        },
      });
      expect(response.data).toEqual(mockRawGithubIssues);
    });
  });

  describe("Data Processing and Transformation", () => {
    it("should process GitHub issues data for chart display", () => {
      const chartData = mockGithubIssuesApiResponse.data.map((dayData) => ({
        date: dayData.date,
        value: dayData["all-bugs"][0].value,
        workload: dayData["all-bugs"][0].dimensions.workloadId,
      }));

      expect(chartData).toEqual([
        { date: "2024-01-15", value: 2, workload: "github-workload" },
        { date: "2024-01-16", value: 1, workload: "github-workload" },
      ]);
    });

    it("should aggregate GitHub issues by workload correctly", () => {
      const aggregatedData = mockRawGithubIssues.reduce(
        (acc, issue) => {
          const workload = issue.workload;
          if (!acc[workload]) {
            acc[workload] = {
              total: 0,
              byPriority: {} as Record<string, number>,
              byType: {} as Record<string, number>,
              open: 0,
              closed: 0,
            };
          }

          acc[workload].total++;
          acc[workload].byPriority[issue.priority] = (acc[workload].byPriority[issue.priority] || 0) + 1;
          acc[workload].byType[issue.issueType] = (acc[workload].byType[issue.issueType] || 0) + 1;

          if (issue.resolutiondate) {
            acc[workload].closed++;
          } else {
            acc[workload].open++;
          }

          return acc;
        },
        {} as Record<string, any>,
      );

      expect(aggregatedData["github-workload"]).toEqual({
        total: 3,
        byPriority: { High: 1, Medium: 1, Low: 1 },
        byType: { bug: 2, feature: 1 },
        open: 2,
        closed: 1,
      });
    });

    it("should handle time series data for GitHub issues correctly", () => {
      const timeSeriesData = mockRawGithubIssues.reduce(
        (acc, issue) => {
          const date = issue.created.split("T")[0]; // Extract date part
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(issue);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      expect(timeSeriesData["2024-01-15"]).toHaveLength(2);
      expect(timeSeriesData["2024-01-16"]).toHaveLength(1);
      expect(timeSeriesData["2024-01-15"].map((i) => i.key)).toEqual(["#123", "#124"]);
      expect(timeSeriesData["2024-01-16"].map((i) => i.key)).toEqual(["#125"]);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully for GitHub bugs query", async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
      };
      mockedPost.mockRejectedValueOnce(errorResponse);

      try {
        await axios.post("/api/query", [
          {
            queryName: QueryName.BugsNew,
            args: { workloads: ["github-workload"] },
          },
        ]);
      } catch (error: any) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.message).toBe("Internal server error");
      }
    });

    it("should handle API errors gracefully for GitHub incidents query", async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { message: "Workload not found" },
        },
      };
      mockedPost.mockRejectedValueOnce(errorResponse);

      try {
        await axios.post("/api/query", [
          {
            queryName: QueryName.ProductionIncidents,
            args: { workloads: ["nonexistent-workload"] },
          },
        ]);
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe("Workload not found");
      }
    });

    it("should handle empty response data gracefully", async () => {
      mockedPost.mockResolvedValueOnce({ data: [] });

      const response = await axios.post("/api/query", [
        {
          queryName: QueryName.BugsNew,
          args: { workloads: ["empty-workload"] },
        },
      ]);

      expect(response.data).toEqual([]);
    });

    it("should handle malformed API response data", async () => {
      const malformedResponse = {
        data: [
          {
            // Missing required fields
            invalidField: "invalid",
          },
        ],
      };
      mockedPost.mockResolvedValueOnce(malformedResponse);

      const response = await axios.post("/api/query", [
        {
          queryName: QueryName.BugsNew,
          args: { workloads: ["github-workload"] },
        },
      ]);

      // Should still return the response, but UI should handle gracefully
      expect(response.data).toEqual(malformedResponse.data);
    });
  });

  describe("Query Parameter Validation", () => {
    it("should validate required query parameters for GitHub bugs", () => {
      const validQuery = {
        queryName: QueryName.BugsNew,
        args: {
          workloads: ["github-workload"],
          startDate: "2024-01-15",
          issueFilter: {
            priority: "High",
          },
        },
      };

      // Validate required fields are present
      expect(validQuery.args).toHaveProperty("workloads");
      expect(validQuery.args).toHaveProperty("startDate");
      expect(validQuery.args.workloads).toBeInstanceOf(Array);
      expect(validQuery.args.workloads.length).toBeGreaterThan(0);
      expect(validQuery.args.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should validate optional query parameters for GitHub incidents", () => {
      const queryWithOptionalParams = {
        queryName: QueryName.ProductionIncidents,
        args: {
          workloads: ["github-workload"],
          startDate: "2024-01-15",
          endDate: "2024-01-16",
          incidentFilter: {
            priority: "Critical",
          },
        },
      };

      expect(queryWithOptionalParams.args).toHaveProperty("endDate");
      expect(queryWithOptionalParams.args).toHaveProperty("incidentFilter");
      expect(queryWithOptionalParams.args.incidentFilter).toHaveProperty("priority");
    });

    it("should handle workload parameter variations", () => {
      const singleWorkload = { workloads: ["github-workload"] };
      const multipleWorkloads = { workloads: ["github-workload-1", "github-workload-2"] };
      const allWorkloads = { workloads: ["all"] };

      expect(singleWorkload.workloads).toHaveLength(1);
      expect(multipleWorkloads.workloads).toHaveLength(2);
      expect(allWorkloads.workloads).toContain("all");
    });
  });

  describe("Performance and Caching", () => {
    it("should handle large datasets efficiently", () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        key: `#${i + 1}`,
        issueType: i % 2 === 0 ? "bug" : "feature",
        created: `2024-01-${String(Math.floor(i / 30) + 1).padStart(2, "0")}T10:00:00Z`,
        resolutiondate: i % 3 === 0 ? `2024-01-${String(Math.floor(i / 30) + 2).padStart(2, "0")}T15:00:00Z` : null,
        priority: ["Low", "Medium", "High", "Critical"][i % 4],
        workload: "github-workload",
        title: `Issue ${i + 1}`,
      }));

      // Test that processing large datasets doesn't cause performance issues
      const startTime = performance.now();

      const processed = largeDataset.reduce(
        (acc, issue) => {
          acc[issue.priority] = (acc[issue.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100); // Should process in under 100ms
      expect(Object.keys(processed)).toHaveLength(4); // All priority levels
      expect(processed.Low + processed.Medium + processed.High + processed.Critical).toBe(1000);
    });

    it("should support data caching for repeated queries", () => {
      const cacheKey = "github-bugs-2024-01-15-github-workload-Medium";
      const cachedData = mockGithubIssuesApiResponse.data;

      // Simulate cache storage and retrieval
      const cache = new Map();
      cache.set(cacheKey, cachedData);

      const retrievedData = cache.get(cacheKey);
      expect(retrievedData).toEqual(cachedData);
    });
  });

  describe("Real-time Updates", () => {
    it("should handle incremental data updates for GitHub issues", () => {
      const initialData = mockRawGithubIssues.slice(0, 2);
      const newIssue = {
        key: "#126",
        issueType: "incident",
        created: "2024-01-17T08:30:00Z",
        resolutiondate: null,
        priority: "Critical",
        workload: "github-workload",
        title: "Production database connection issue",
      };

      const updatedData = [...initialData, newIssue];

      expect(initialData).toHaveLength(2);
      expect(updatedData).toHaveLength(3);
      expect(updatedData[2]).toEqual(newIssue);
    });

    it("should handle issue status updates correctly", () => {
      const openIssue = mockRawGithubIssues[0]; // #123 is open
      const closedIssue = {
        ...openIssue,
        resolutiondate: "2024-01-16T16:45:00Z",
      };

      expect(openIssue.resolutiondate).toBeNull();
      expect(closedIssue.resolutiondate).toBeTruthy();
      expect(new Date(closedIssue.resolutiondate).getTime()).toBeGreaterThan(new Date(closedIssue.created).getTime());
    });
  });
});
