import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import client from "@/api/client";
import { submitAsyncQuery, pollForResult } from "@/services/asyncQuery";
import { QUERY_ASYNC, QUERY_ASYNC_JOB } from "@/api/endpoints";

vi.mock("@/api/client", () => {
  class HttpError extends Error {
    response: { status: number; statusText: string; data: unknown };
    constructor(message: string, status: number, statusText: string, data: unknown) {
      super(message);
      this.name = "HttpError";
      this.response = { status, statusText, data };
    }
  }

  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
    },
    HttpError,
  };
});

vi.mock("@/utils/metrics", () => ({
  convertMetricsObjToMap: vi.fn((data) => new Map(Object.entries(data))),
}));

describe("asyncQuery service", () => {
  describe("submitAsyncQuery", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("submits query and returns job ID and poll URL", async () => {
      vi.mocked(client.post).mockResolvedValue({
        data: { jobId: "job-123", pollUrl: "/api/query/async/job-123" },
        status: 202,
      });

      const result = await submitAsyncQuery({ queryName: "test", args: {} });

      expect(client.post).toHaveBeenCalledWith(QUERY_ASYNC, { queryName: "test", args: {} });
      expect(result).toEqual({ jobId: "job-123", pollUrl: "/api/query/async/job-123" });
    });
  });

  describe("pollForResult", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns result when query completes immediately", async () => {
      const mockResult = { workload1: { "2024-01-01": { value: 1 } } };
      vi.mocked(client.get).mockResolvedValue({
        data: mockResult,
        status: 200,
      });

      const result = await pollForResult("job-123");

      expect(client.get).toHaveBeenCalledWith(QUERY_ASYNC_JOB("job-123"));
      expect(result).toBeInstanceOf(Map);
    });

    it("polls with backoff when still processing", async () => {
      vi.mocked(client.get)
        .mockResolvedValueOnce({ data: { status: "processing" }, status: 202 })
        .mockResolvedValueOnce({ data: { workload1: {} }, status: 200 });

      const result = pollForResult("job-123", 60000, 10);

      await vi.advanceTimersByTimeAsync(10);
      await vi.advanceTimersByTimeAsync(15);

      await expect(result).resolves.toBeInstanceOf(Map);
      expect(client.get).toHaveBeenCalledTimes(2);
    });

    it("throws when query times out", async () => {
      vi.useRealTimers();
      vi.mocked(client.get).mockResolvedValue({ data: { status: "processing" }, status: 202 });

      await expect(pollForResult("job-123", 50, 10)).rejects.toThrow("Query timed out after 50ms");
    });

    it("throws when query fails with 500", async () => {
      const { HttpError } = await import("@/api/client");
      vi.mocked(client.get).mockRejectedValue(
        new HttpError("Request failed with status 500", 500, "Internal Server Error", { error: "Query execution failed" })
      );

      await expect(pollForResult("job-123")).rejects.toThrow("Query failed: Query execution failed");
    });

    it("throws when job not found", async () => {
      vi.mocked(client.get).mockResolvedValue({ data: null, status: 204 });

      await expect(pollForResult("job-123")).rejects.toThrow("Query job job-123 not found");
    });
  });
});
