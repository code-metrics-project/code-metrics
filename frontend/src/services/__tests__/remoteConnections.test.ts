import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRemoteConnections } from "../remoteConnections";
import type { RemoteConnectionsResponse } from "../remoteConnections";
import client from "@/api/client";

vi.mock("@/api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("remoteConnections service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("checkRemoteConnections", () => {
    it("should return connection check results on success", async () => {
      const mockResponse: RemoteConnectionsResponse = {
        results: [
          {
            id: "github-main",
            category: "codeManagement",
            type: "github",
            url: "https://api.github.com",
            status: "connected",
            responseTimeMs: 123,
          },
          {
            id: "sonar-dev",
            category: "codeAnalysis",
            type: "sonar",
            url: "https://sonar.example.com",
            status: "unauthorised",
            statusDetail: "401 Unauthorized",
            responseTimeMs: 456,
          },
        ],
        checkedAt: "2026-06-05T10:00:00.000Z",
      };

      (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
        status: 200,
      });

      const result = await checkRemoteConnections();

      expect(client.get).toHaveBeenCalledWith("/api/admin/remote-connections");
      expect(result).toEqual(mockResponse);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe("connected");
      expect(result.results[1].status).toBe("unauthorised");
    });

    it("should handle empty results", async () => {
      const mockResponse: RemoteConnectionsResponse = {
        results: [],
        checkedAt: "2026-06-05T10:00:00.000Z",
      };

      (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
        status: 200,
      });

      const result = await checkRemoteConnections();

      expect(result.results).toHaveLength(0);
      expect(result.checkedAt).toBe("2026-06-05T10:00:00.000Z");
    });

    it("should handle all connection statuses", async () => {
      const mockResponse: RemoteConnectionsResponse = {
        results: [
          {
            id: "server-1",
            category: "codeManagement",
            type: "github",
            status: "connected",
            responseTimeMs: 100,
          },
          {
            id: "server-2",
            category: "pipelines",
            type: "jenkins",
            status: "unreachable",
            statusDetail: "Connection timeout",
          },
          {
            id: "server-3",
            category: "codeAnalysis",
            type: "sonar",
            status: "unauthorised",
            statusDetail: "403 Forbidden",
          },
          {
            id: "server-4",
            category: "ticketManagement",
            type: "jira",
            status: "error",
            statusDetail: "500 Internal Server Error",
          },
          {
            id: "server-5",
            category: "llm",
            type: "claude",
            status: "unconfigured",
          },
          {
            id: "server-6",
            category: "ticketManagement",
            type: "jira",
            status: "rateLimited",
            statusDetail: "Rate limited. Retry after 60 seconds",
            responseTimeMs: 150,
          },
        ],
        checkedAt: "2026-06-05T10:00:00.000Z",
      };

      (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: mockResponse,
        status: 200,
      });

      const result = await checkRemoteConnections();

      expect(result.results).toHaveLength(6);
      expect(result.results.map((r) => r.status)).toEqual([
        "connected",
        "unreachable",
        "unauthorised",
        "error",
        "unconfigured",
        "rateLimited",
      ]);
    });

    it("should log error and rethrow on failure", async () => {
      const mockError = new Error("Network error");

      (client.get as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

      await expect(checkRemoteConnections()).rejects.toThrow("Network error");

      expect(console.error).toHaveBeenCalledWith("Failed to check remote connections:", mockError);
    });

    it("should handle HTTP error responses", async () => {
      const httpError = {
        message: "Request failed with status 403",
        response: {
          status: 403,
          statusText: "Forbidden",
          data: { error: "Insufficient permissions" },
        },
      };

      (client.get as ReturnType<typeof vi.fn>).mockRejectedValue(httpError);

      await expect(checkRemoteConnections()).rejects.toMatchObject({
        message: "Request failed with status 403",
      });

      expect(console.error).toHaveBeenCalledWith("Failed to check remote connections:", httpError);
    });
  });
});
