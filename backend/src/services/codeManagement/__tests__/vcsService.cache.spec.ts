import { CachingVcsServiceImpl, VcsService } from "../vcsService";
import {
  CommitFileChanges,
  CompletePrInfo,
  PREvent,
  PREventDetail,
  PullRequest,
  RepoChange,
  RepoChangeSummary,
} from "../../../model/vcs";
import { DatedMetricEntry } from "../../../model/metrics";
import { TMergeRules } from "../../../model/qualityGates";
import { WorkloadId } from "../../../model/config/workload-config";

const cacheStore = new Map<string, any>();

jest.mock("../../../config/configMapping", () => ({
  getWorkloadById: jest.fn(() => ({
    codeManagement: {
      serverId: "server-1",
    },
  })),
}));

jest.mock("../../../db/factory", () => ({
  provideDatastore: jest.fn(() => ({
    findOrInsertOne: async (_collection: string, query: Record<string, unknown>, populator: () => Promise<any>) => {
      const queryKey = JSON.stringify(query);
      if (!cacheStore.has(queryKey)) {
        cacheStore.set(queryKey, await populator());
      }
      return cacheStore.get(queryKey);
    },
    findOrInsertOneDated: async (
      _collection: string,
      _date: Date,
      query: Record<string, unknown>,
      populator: () => Promise<any>,
    ) => {
      const queryKey = JSON.stringify(query);
      if (!cacheStore.has(queryKey)) {
        cacheStore.set(queryKey, await populator());
      }
      return cacheStore.get(queryKey);
    },
  })),
}));

jest.mock("../../../config/sources/source", () => ({
  getConfigItem: jest.fn(() => "true"),
  getConfigItemAsNumber: jest.fn((_key: string, defaultValue: number) => defaultValue),
}));

const createDelegate = (): VcsService => {
  const getPRsInDateRange = jest.fn<
    Promise<CompletePrInfo[]>,
    [WorkloadId, string, string, Date, Date, number | undefined]
  >(async () => []);

  const getCommitFileChanges = jest.fn<
    Promise<CommitFileChanges[]>,
    [WorkloadId, string, string, string[], string, string]
  >(async () => []);

  return {
    getReposForProject: async () => [],
    getPROpenTimeFromRepo: async () => [] as PREvent[],
    getPRSizeFromRepo: async () => [] as PREventDetail[],
    getPRsForIssuesFromRepository: async () => [],
    getPRsInDateRange,
    fetchChangesInDateRange: async () => [] as RepoChange[],
    summariseChangesInDateRange: async () => [] as DatedMetricEntry<RepoChangeSummary>[],
    getCommitFileChanges,
    getPRForCommit: async () => null as PullRequest | null,
    getEarliestCommitForPr: async () => ({}) as RepoChange,
    buildCommitLink: () => "",
    buildPRLink: () => "",
    buildRepoLink: () => "",
    fetchFile: async () => null,
    fetchMergeRules: async () => [] as TMergeRules[],
  };
};

describe("CachingVcsServiceImpl temporal retrieval caching", () => {
  beforeEach(() => {
    cacheStore.clear();
  });

  it("caches PR retrieval per day for identical date range and repo", async () => {
    const delegate = createDelegate();
    const cachedVcs = new CachingVcsServiceImpl(delegate);
    const startDate = new Date("2025-01-01T00:00:00.000Z");
    const endDate = new Date("2025-01-03T23:59:59.999Z");

    await cachedVcs.getPRsInDateRange("workload-1", "proj", "repo", startDate, endDate, 100);
    await cachedVcs.getPRsInDateRange("workload-1", "proj", "repo", startDate, endDate, 100);

    expect(delegate.getPRsInDateRange).toHaveBeenCalledTimes(3);
  });

  it("reuses PR cache across overlapping date ranges", async () => {
    const delegate = createDelegate();
    const cachedVcs = new CachingVcsServiceImpl(delegate);

    await cachedVcs.getPRsInDateRange(
      "workload-1",
      "proj",
      "repo",
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2025-01-02T23:59:59.999Z"),
      100,
    );

    await cachedVcs.getPRsInDateRange(
      "workload-1",
      "proj",
      "repo",
      new Date("2025-01-02T00:00:00.000Z"),
      new Date("2025-01-03T23:59:59.999Z"),
      100,
    );

    expect(delegate.getPRsInDateRange).toHaveBeenCalledTimes(3);
  });

  it("caches commit file changes regardless of branch order", async () => {
    const delegate = createDelegate();
    const cachedVcs = new CachingVcsServiceImpl(delegate);

    await cachedVcs.getCommitFileChanges("workload-1", "proj", "repo", ["main", "release"], "2025-01-01", "2025-01-02");
    await cachedVcs.getCommitFileChanges("workload-1", "proj", "repo", ["release", "main"], "2025-01-01", "2025-01-02");

    expect(delegate.getCommitFileChanges).toHaveBeenCalledTimes(2);
  });

  it("reuses commit file changes cache across overlapping date ranges", async () => {
    const delegate = createDelegate();
    const cachedVcs = new CachingVcsServiceImpl(delegate);

    await cachedVcs.getCommitFileChanges("workload-1", "proj", "repo", ["main"], "2025-01-01", "2025-01-02");
    await cachedVcs.getCommitFileChanges("workload-1", "proj", "repo", ["main"], "2025-01-02", "2025-01-03");

    expect(delegate.getCommitFileChanges).toHaveBeenCalledTimes(3);
  });
});
