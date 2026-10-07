import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { DatedMetrics } from "@/model/metrics";
import { usePipelineHealthOutcomes } from "@/queries/usePipelineHealthOutcomes";

const { mockExecuteQuery } = vi.hoisted(() => ({ mockExecuteQuery: vi.fn() }));

vi.mock("@/services/query", () => ({
  executeQuerySync: (...args: unknown[]) => mockExecuteQuery(...args),
}));

vi.mock("@/config", () => ({
  listWorkloadIds: () => ["workload-a", "workload-b"],
  listJobGroups: () => ["build", "deploy"],
}));

function dataFor(success: number, failed: number): Map<string, DatedMetrics> {
  const map = new Map<string, DatedMetrics>();
  map.set("runs", {
    entries: new Map([
      [`runs-successful`, { date: "2026-09-01", value: success }],
      [`runs-failed`, { date: "2026-09-01", value: failed }],
    ]),
  });
  return map;
}

describe("usePipelineHealthOutcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteQuery.mockResolvedValue(new Map());
  });

  it("does nothing when there are no raw queries", async () => {
    const { result } = renderHook(() => usePipelineHealthOutcomes());

    await act(async () => {
      await result.current.execute([]);
    });

    expect(mockExecuteQuery).not.toHaveBeenCalled();
    expect(result.current.hasExecuted).toBe(false);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("splits the query per workload and job group and builds outcomes", async () => {
    mockExecuteQuery.mockImplementation(async () => dataFor(70, 30));
    const { result } = renderHook(() => usePipelineHealthOutcomes());

    await act(async () => {
      await result.current.execute([
        {
          queryName: "pipeline-runs",
          args: {
            workloads: ["all"],
            jobGroups: [],
            stageId: "stage-1",
            branchNames: ["main"],
            startDate: "2026-08-12",
            endDate: "2026-09-11",
          },
        },
      ]);
    });

    expect(mockExecuteQuery).toHaveBeenCalledTimes(4);
    expect(result.current.hasExecuted).toBe(true);
    expect(result.current.isBusy).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.outcomes).toHaveLength(4);

    const first = result.current.outcomes[0];
    expect(first.key).toBe("workload-a-build");
    expect(first.success).toBe(70);
    expect(first.runsUrl).toBe(
      "/workload/pipeline-runs?executeImmediately=true&workloadId=workload-a&stageId=stage-1&branchName=main&jobGroup=build&startDate=2026-08-12&endDate=2026-09-11"
    );
  });

  it("omits outcomes with no data but still marks the query as executed", async () => {
    const { result } = renderHook(() => usePipelineHealthOutcomes());

    await act(async () => {
      await result.current.execute([
        {
          queryName: "pipeline-runs",
          args: { workloads: ["workload-a"], jobGroups: ["build"] },
        },
      ]);
    });

    expect(result.current.outcomes).toHaveLength(0);
    expect(result.current.hasExecuted).toBe(true);
  });

  it("sets an error when a query fails", async () => {
    mockExecuteQuery.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => usePipelineHealthOutcomes());

    await act(async () => {
      await result.current.execute([
        {
          queryName: "pipeline-runs",
          args: { workloads: ["workload-a"], jobGroups: ["build"] },
        },
      ]);
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.error?.message).toBe("boom");
    expect(result.current.outcomes).toHaveLength(0);
    expect(result.current.isBusy).toBe(false);
  });

  it("wraps a thrown non-Error value in an Error", async () => {
    mockExecuteQuery.mockRejectedValue("kaboom");
    const { result } = renderHook(() => usePipelineHealthOutcomes());

    await act(async () => {
      await result.current.execute([
        {
          queryName: "pipeline-runs",
          args: { workloads: ["workload-a"], jobGroups: ["build"] },
        },
      ]);
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.error?.message).toBe("kaboom");
    expect(result.current.isBusy).toBe(false);
  });

  it("is busy while queries are in flight", async () => {
    let resolve!: (value: Map<string, DatedMetrics>) => void;
    mockExecuteQuery.mockImplementation(
      () =>
        new Promise<Map<string, DatedMetrics>>((res) => {
          resolve = res;
        })
    );
    const { result } = renderHook(() => usePipelineHealthOutcomes());

    let executePromise: Promise<void>;
    await act(async () => {
      executePromise = result.current.execute([
        {
          queryName: "pipeline-runs",
          args: { workloads: ["workload-a"], jobGroups: ["build"] },
        },
      ]);
    });

    expect(result.current.isBusy).toBe(true);

    await act(async () => {
      resolve(new Map());
      await executePromise;
    });

    expect(result.current.isBusy).toBe(false);
  });
});
