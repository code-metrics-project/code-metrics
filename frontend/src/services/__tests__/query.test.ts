import { describe, expect, it, vi, beforeEach } from "vitest";
import client from "@/api/client";
import { executeQuerySync } from "@/services/query";
import { QUERY } from "@/api/endpoints";

vi.mock("@/api/client", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("@/utils/metrics", () => ({
  convertMetricsObjToMap: vi.fn((data) => new Map(Object.entries(data))),
}));

vi.mock("@/utils/logger", () => ({
  logger: vi.fn(),
}));

describe("query service (sync)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes a query via the sync endpoint", async () => {
    const mockData = { workload1: { "2024-01-01": { value: 42 } } };
    vi.mocked(client.post).mockResolvedValue({
      data: mockData,
      status: 200,
    });

    const result = await executeQuerySync({ queryName: "test-query", args: {} });

    expect(client.post).toHaveBeenCalledWith(QUERY, { queryName: "test-query", args: {} });
    expect(result).toBeInstanceOf(Map);
  });

  it("throws when the query fails", async () => {
    vi.mocked(client.post).mockRejectedValue(new Error("network error"));

    await expect(executeQuerySync({ queryName: "test-query", args: {} })).rejects.toThrow(
      'Failed to fetch query "test-query": Error: network error'
    );
  });
});
