import * as pipelines from "../pipelines"; // Import the module
import { getPipelineRunsWithArgs } from "../../../routes/pipelines";
import { ActorType, RunResult, RunWithMetadata } from "../../../model/runs";

jest.mock("../../../routes/pipelines", () => ({
  getPipelineRunsWithArgs: jest.fn(),
}));

jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  verbose: jest.fn(),
}));

const mockPipelineRuns: RunWithMetadata[] = [
  {
    jobGroup: "backend",
    workloadId: "workload1",
    stageId: "build-stage",
    run: {
      id: "30433642",
      job: "/.*/",
      branch: "main",
      startDate: "2011-04-19T19:33:08Z",
      result: RunResult.Succeeded,
      repo: "hello-world",
      duration: 600,
      user: "octocat",
      userType: ActorType.User,
    },
  },
  {
    jobGroup: "backend",
    workloadId: "workload2",
    stageId: "build-stage",
    run: {
      id: "30433642",
      job: "/.*/",
      branch: "main",
      startDate: "2011-04-19T19:33:08Z",
      result: RunResult.Succeeded,
      repo: "hello-world",
      duration: 600,
      user: "octocat",
      userType: ActorType.Bot,
    },
  },
  {
    jobGroup: "backend",
    workloadId: "workload3",
    stageId: "build-stage",
    run: {
      id: "30433642",
      job: "/.*/",
      branch: "main",
      startDate: "2011-04-19T19:33:08Z",
      result: RunResult.Succeeded,
      repo: "hello-world",
      duration: 600,
    },
  },
];

describe("fetchPipelineRuns", () => {
  let testRuns: RunWithMetadata[];

  beforeEach(() => {
    testRuns = JSON.parse(JSON.stringify(mockPipelineRuns));
    (getPipelineRunsWithArgs as jest.Mock).mockResolvedValue(testRuns);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should Call getPipelineRunsWithArgs correctly", async () => {
    const workloads = ["workload1"];
    const startDate = "2024-09-19";
    const jobGroups = ["group1"];
    const branchNames = ["main"];
    const actorType = ActorType.All;
    const stageId = "build-stage";

    const runs = await pipelines.fetchPipelineRuns({
      workloads,
      startDate,
      jobGroups,
      branchNames,
      actorType,
      stageId,
    });

    expect(runs.size).toBe(1);

    const dailyMetrics = runs.get("2011-04-19");
    expect(dailyMetrics).toBeDefined();

    const runsSuccessful = dailyMetrics["runs-successful"];
    expect(runsSuccessful).toHaveLength(3);

    const runsFailed = dailyMetrics["runs-failed"];
    expect(runsFailed).toHaveLength(3);

    const runsAborted = dailyMetrics["runs-aborted"];
    expect(runsAborted).toHaveLength(3);

    const successful = runsSuccessful.filter(
      (metric) => metric.dimensions.workloadId === "workload1" && metric.dimensions.repoName === "hello-world",
    );
    expect(successful).toHaveLength(1);
    expect(successful[0].date.toISOString()).toEqual("2011-04-19T00:00:00.000Z");
    expect(successful[0].value).toEqual(1);

    const failed = runsFailed.filter(
      (metric) => metric.dimensions.workloadId === "workload1" && metric.dimensions.repoName === "hello-world",
    );
    expect(failed).toHaveLength(1);
    expect(failed[0].date.toISOString()).toEqual("2011-04-19T00:00:00.000Z");
    expect(failed[0].value).toEqual(0);

    const aborted = runsAborted.filter(
      (metric) => metric.dimensions.workloadId === "workload1" && metric.dimensions.repoName === "hello-world",
    );
    expect(aborted).toHaveLength(1);
    expect(aborted[0].date.toISOString()).toEqual("2011-04-19T00:00:00.000Z");
    expect(aborted[0].value).toEqual(0);

    expect(getPipelineRunsWithArgs).toHaveBeenCalledWith({
      branches: branchNames,
      jobGroups,
      startDate,
      workloads,
      stageId,
    });
  });

  it("should handle errors when getPipelineRunsWithArgs throws", async () => {
    (getPipelineRunsWithArgs as jest.Mock).mockRejectedValue(new Error("API failed"));

    const workloads = ["workload1"];
    const startDate = "2024-09-19";
    const jobGroups = ["group1"];
    const branchNames = ["main"];
    const actorType = ActorType.All;
    const stageId = "build-stage";

    await expect(
      pipelines.fetchPipelineRuns({
        workloads,
        startDate,
        jobGroups,
        branchNames,
        actorType,
        stageId,
      }),
    ).rejects.toThrow("Failed to fetch pipeline runs: Error: API failed");
  });

  it("should filter pipeline runs based on actorType User", async () => {
    const expectedRes = [
      {
        jobGroup: "backend",
        workloadId: "workload1",
        stageId: "build-stage",
        run: {
          id: "30433642",
          job: "/.*/",
          branch: "main",
          startDate: "2011-04-19T19:33:08Z",
          result: "SUCCEEDED",
          repo: "hello-world",
          duration: 600,
          user: "octocat",
          userType: "User",
        },
      },
      {
        jobGroup: "backend",
        workloadId: "workload3",
        stageId: "build-stage",
        run: {
          id: "30433642",
          job: "/.*/",
          branch: "main",
          startDate: "2011-04-19T19:33:08Z",
          result: "SUCCEEDED",
          repo: "hello-world",
          duration: 600,
        },
      },
    ];
    const result = pipelines.testables.actorFilter(ActorType.User, testRuns);
    expect(result).toEqual(expectedRes);
  });

  it("should filter pipeline runs based on actorType Bot", async () => {
    const expectedRes = [
      {
        jobGroup: "backend",
        workloadId: "workload2",
        stageId: "build-stage",
        run: {
          id: "30433642",
          job: "/.*/",
          branch: "main",
          startDate: "2011-04-19T19:33:08Z",
          result: "SUCCEEDED",
          repo: "hello-world",
          duration: 600,
          user: "octocat",
          userType: "Bot",
        },
      },
      {
        jobGroup: "backend",
        workloadId: "workload3",
        stageId: "build-stage",
        run: {
          id: "30433642",
          job: "/.*/",
          branch: "main",
          startDate: "2011-04-19T19:33:08Z",
          result: "SUCCEEDED",
          repo: "hello-world",
          duration: 600,
        },
      },
    ];
    const result = pipelines.testables.actorFilter(ActorType.Bot, testRuns);
    expect(result).toEqual(expectedRes);
  });

  it("should NOT filter pipeline runs based on actorType All", async () => {
    const expectedRes = [
      {
        jobGroup: "backend",
        workloadId: "workload1",
        stageId: "build-stage",
        run: {
          id: "30433642",
          job: "/.*/",
          branch: "main",
          startDate: "2011-04-19T19:33:08Z",
          result: "SUCCEEDED",
          repo: "hello-world",
          duration: 600,
          user: "octocat",
          userType: "User",
        },
      },
      {
        jobGroup: "backend",
        workloadId: "workload2",
        stageId: "build-stage",
        run: {
          id: "30433642",
          job: "/.*/",
          branch: "main",
          startDate: "2011-04-19T19:33:08Z",
          result: "SUCCEEDED",
          repo: "hello-world",
          duration: 600,
          user: "octocat",
          userType: "Bot",
        },
      },
      {
        jobGroup: "backend",
        workloadId: "workload3",
        stageId: "build-stage",
        run: {
          id: "30433642",
          job: "/.*/",
          branch: "main",
          startDate: "2011-04-19T19:33:08Z",
          result: "SUCCEEDED",
          repo: "hello-world",
          duration: 600,
        },
      },
    ];

    const result = pipelines.testables.actorFilter(ActorType.All, testRuns);
    expect(result).toEqual(expectedRes);
  });
});
