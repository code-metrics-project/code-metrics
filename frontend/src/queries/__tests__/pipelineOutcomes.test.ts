import { describe, expect, it, vi } from "vitest";
import type { DatedMetrics } from "@/model/metrics";
import {
  PIPELINE_RUNS_QUERY_NAME,
  buildRunsUrl,
  calculateRunPercentages,
  expandJobGroups,
  expandWorkloads,
  extractSuccessPercent,
  outcomeFromResult,
  splitPipelineRunQueries,
  toDoughnutChartData,
} from "@/queries/pipelineOutcomes";

vi.mock("@/config", () => ({
  listWorkloadIds: () => ["workload-a", "workload-b"],
  listJobGroups: () => ["build", "deploy"],
}));

function datedMetrics(entries: Record<string, number>): DatedMetrics {
  const map = new Map<string, { date: string; value: number }>();
  for (const [tag, value] of Object.entries(entries)) {
    map.set(tag, { date: "2026-09-01", value });
  }
  return { entries: map };
}

describe("expandWorkloads", () => {
  it("expands undefined to all workloads", () => {
    expect(expandWorkloads(undefined)).toEqual(["workload-a", "workload-b"]);
  });

  it("expands an empty selection to all workloads", () => {
    expect(expandWorkloads([])).toEqual(["workload-a", "workload-b"]);
  });

  it("expands the special 'all' value to all workloads", () => {
    expect(expandWorkloads(["all"])).toEqual(["workload-a", "workload-b"]);
  });

  it("keeps an explicit selection", () => {
    expect(expandWorkloads(["workload-a"])).toEqual(["workload-a"]);
  });
});

describe("expandJobGroups", () => {
  it("expands undefined to all job groups", () => {
    expect(expandJobGroups(undefined)).toEqual(["build", "deploy"]);
  });

  it("expands an empty selection to all job groups", () => {
    expect(expandJobGroups([])).toEqual(["build", "deploy"]);
  });

  it("keeps an explicit selection", () => {
    expect(expandJobGroups(["build"])).toEqual(["build"]);
  });
});

describe("splitPipelineRunQueries", () => {
  it("creates one query per workload and job group", () => {
    const queries = splitPipelineRunQueries({ workloads: ["all"], jobGroups: [] });

    expect(queries).toHaveLength(4);
    expect(queries.map((q) => `${q.args.workloads}-${q.args.jobGroups}`)).toEqual([
      "workload-a-build",
      "workload-a-deploy",
      "workload-b-build",
      "workload-b-deploy",
    ]);
    for (const query of queries) {
      expect(query.queryName).toBe(PIPELINE_RUNS_QUERY_NAME);
      expect(query.args.workloads).toHaveLength(1);
      expect(query.args.jobGroups).toHaveLength(1);
    }
  });

  it("preserves shared args on each split query", () => {
    const args = {
      workloads: ["workload-a"],
      jobGroups: ["build"],
      stageId: "stage-1",
      branchNames: ["main"],
      startDate: "2026-08-12",
    };

    const [query] = splitPipelineRunQueries(args);

    expect(query.args).toEqual({
      ...args,
      workloads: ["workload-a"],
      jobGroups: ["build"],
    });
    expect(query.args.stageId).toBe("stage-1");
    expect(query.args.branchNames).toEqual(["main"]);
    expect(query.args.startDate).toBe("2026-08-12");
  });
});

describe("calculateRunPercentages", () => {
  it("calculates the percentage of each tag within its group", () => {
    const data = new Map<string, DatedMetrics>([
      ["runs-successful", datedMetrics({ "runs-successful/workload-a": 70, "runs-failed/workload-a": 20, "runs-aborted/workload-a": 10 })],
    ]);

    expect(calculateRunPercentages(data)).toEqual(
      new Map([
        ["runs-successful/workload-a", 70],
        ["runs-failed/workload-a", 20],
        ["runs-aborted/workload-a", 10],
      ])
    );
  });

  it("sums values across dates before calculating percentages", () => {
    const data = new Map<string, DatedMetrics>([
      ["day-1", datedMetrics({ "runs-successful/workload-a": 25, "runs-failed/workload-a": 25 })],
      ["day-2", datedMetrics({ "runs-successful/workload-a": 25, "runs-failed/workload-a": 25 })],
    ]);

    expect(calculateRunPercentages(data)).toEqual(
      new Map([
        ["runs-successful/workload-a", 50],
        ["runs-failed/workload-a", 50],
      ])
    );
  });

  it("calculates percentages independently per group", () => {
    const data = new Map<string, DatedMetrics>([
      [
        "runs",
        datedMetrics({
          "runs-successful/workload-a": 90,
          "runs-failed/workload-a": 10,
          "runs-successful/workload-b": 10,
          "runs-failed/workload-b": 90,
        }),
      ],
    ]);

    expect(calculateRunPercentages(data)).toEqual(
      new Map([
        ["runs-successful/workload-a", 90],
        ["runs-failed/workload-a", 10],
        ["runs-successful/workload-b", 10],
        ["runs-failed/workload-b", 90],
      ])
    );
  });

  it("groups tags without a dimension under 'all'", () => {
    const data = new Map<string, DatedMetrics>([["runs", datedMetrics({ "runs-successful": 6, "runs-failed": 4 })]]);

    expect(calculateRunPercentages(data)).toEqual(
      new Map([
        ["runs-successful", 60],
        ["runs-failed", 40],
      ])
    );
  });

  it("returns 0 for tags in an empty group", () => {
    const data = new Map<string, DatedMetrics>([["runs", datedMetrics({ "runs-successful/workload-a": 0, "runs-failed/workload-a": 0 })]]);

    expect(calculateRunPercentages(data)).toEqual(
      new Map([
        ["runs-successful/workload-a", 0],
        ["runs-failed/workload-a", 0],
      ])
    );
  });

  it("rounds percentages to one decimal place", () => {
    const data = new Map<string, DatedMetrics>([["runs", datedMetrics({ "runs-successful/workload-a": 1, "runs-failed/workload-a": 2 })]]);

    expect(calculateRunPercentages(data).get("runs-successful/workload-a")).toBe(33.3);
  });
});

describe("toDoughnutChartData", () => {
  it("maps values to labels, data and semantic colours", () => {
    const values = new Map<string, number>([
      ["runs-successful/workload-a", 70],
      ["runs-failed/workload-a", 20],
      ["runs-aborted/workload-a", 10],
    ]);

    expect(toDoughnutChartData(values)).toEqual({
      labels: ["runs-successful/workload-a", "runs-failed/workload-a", "runs-aborted/workload-a"],
      data: [70, 20, 10],
      // Colours are picked from the semantic category by label position.
      colors: ["#10b981", "#f87171", "#fcd34d"],
    });
  });

  it("handles empty values", () => {
    expect(toDoughnutChartData(new Map())).toEqual({ labels: [], data: [], colors: [] });
  });
});

describe("extractSuccessPercent", () => {
  it("returns the value of the successful axis wherever it appears", () => {
    expect(extractSuccessPercent(["runs-failed/workload-a", "runs-successful/workload-a"], [20, 70])).toBe(70);
  });

  it("returns 0 when no successful axis is present", () => {
    expect(extractSuccessPercent(["runs-failed/workload-a", "runs-aborted/workload-a"], [50, 50])).toBe(0);
  });
});

describe("buildRunsUrl", () => {
  it("includes the query context in the runs url", () => {
    expect(
      buildRunsUrl("workload-a", "build", {
        stageId: "stage-1",
        branchName: "main",
        startDate: "2026-08-12",
        endDate: "2026-09-11",
      })
    ).toBe(
      "/workload/pipeline-runs?executeImmediately=true&workloadId=workload-a&stageId=stage-1&branchName=main&jobGroup=build&startDate=2026-08-12&endDate=2026-09-11"
    );
  });

  it("omits null context values", () => {
    expect(buildRunsUrl("workload-a", "build", { stageId: null, branchName: null, startDate: null, endDate: null })).toBe(
      "/workload/pipeline-runs?executeImmediately=true&workloadId=workload-a&jobGroup=build"
    );
  });
});

describe("outcomeFromResult", () => {
  it("returns null when the result has no data", () => {
    expect(outcomeFromResult("workload-a", "build", undefined, {})).toBeNull();
    expect(outcomeFromResult("workload-a", "build", new Map(), {})).toBeNull();
  });

  it("builds an outcome with key, success percentage, chart data and runs url", () => {
    const data = new Map<string, DatedMetrics>([
      [
        "runs",
        datedMetrics({
          "runs-successful/workload-a": 70,
          "runs-failed/workload-a": 20,
          "runs-aborted/workload-a": 10,
        }),
      ],
    ]);

    const outcome = outcomeFromResult("workload-a", "build", data, { stageId: "stage-1", branchName: "main" });

    expect(outcome).not.toBeNull();
    expect(outcome?.key).toBe("workload-a-build");
    expect(outcome?.success).toBe(70);
    expect(outcome?.chartData.data).toEqual([70, 20, 10]);
    expect(outcome?.runsUrl).toBe(
      "/workload/pipeline-runs?executeImmediately=true&workloadId=workload-a&stageId=stage-1&branchName=main&jobGroup=build"
    );
  });
});
