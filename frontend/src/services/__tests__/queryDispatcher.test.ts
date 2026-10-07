import { describe, expect, it, vi, beforeEach } from "vitest";
import { executeQuery } from "@/services/queryDispatcher";
import * as asyncQuery from "@/services/asyncQuery";
import * as syncQuery from "@/services/query";
import * as features from "@/config/features";
import type { DatedMetrics } from "@/model/metrics";

vi.mock("@/services/asyncQuery", () => ({
  executeQueryAsync: vi.fn(),
}));

vi.mock("@/services/query", () => ({
  executeQuerySync: vi.fn(),
}));

vi.mock("@/config/features", () => ({
  Features: {
    asyncQuery: "FEATURE_ASYNC_QUERY",
  },
  isFeatureActive: vi.fn(),
}));

describe("queryDispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses async query when the asyncQuery feature is active", async () => {
    vi.mocked(features.isFeatureActive).mockReturnValue(true);
    const mockResult = new Map<string, DatedMetrics>([
      ["date1", { entries: new Map([["m", { date: "2024-01-01", value: 1 }]]) }],
    ]);
    vi.mocked(asyncQuery.executeQueryAsync).mockResolvedValue(mockResult);

    const result = await executeQuery({ queryName: "test", args: {} });

    expect(asyncQuery.executeQueryAsync).toHaveBeenCalledWith({ queryName: "test", args: {} });
    expect(syncQuery.executeQuerySync).not.toHaveBeenCalled();
    expect(result).toBe(mockResult);
  });

  it("falls back to sync query when the asyncQuery feature is inactive", async () => {
    vi.mocked(features.isFeatureActive).mockReturnValue(false);
    const mockResult = new Map<string, DatedMetrics>([
      ["date1", { entries: new Map([["m", { date: "2024-01-01", value: 2 }]]) }],
    ]);
    vi.mocked(syncQuery.executeQuerySync).mockResolvedValue(mockResult);

    const result = await executeQuery({ queryName: "test", args: {} });

    expect(syncQuery.executeQuerySync).toHaveBeenCalledWith({ queryName: "test", args: {} });
    expect(asyncQuery.executeQueryAsync).not.toHaveBeenCalled();
    expect(result).toBe(mockResult);
  });

  it("propagates errors from the async path", async () => {
    vi.mocked(features.isFeatureActive).mockReturnValue(true);
    vi.mocked(asyncQuery.executeQueryAsync).mockRejectedValue(new Error("async error"));

    await expect(executeQuery({ queryName: "test", args: {} })).rejects.toThrow("async error");
  });

  it("propagates errors from the sync path", async () => {
    vi.mocked(features.isFeatureActive).mockReturnValue(false);
    vi.mocked(syncQuery.executeQuerySync).mockRejectedValue(new Error("sync error"));

    await expect(executeQuery({ queryName: "test", args: {} })).rejects.toThrow("sync error");
  });
});
