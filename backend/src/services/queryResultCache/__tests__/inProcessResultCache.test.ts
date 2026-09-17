import { InProcessResultCache } from "../inProcessResultCache";
import { QueryJobStatus } from "../../../model/queryJob";
import { RawQuery } from "../../../model/query";

jest.mock("../../../config/sources/source");

describe("InProcessResultCache", () => {
  let cache: InProcessResultCache;
  const query: RawQuery = { queryName: "test", args: {} };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.resetModules();
    jest.requireMock("../../../config/sources/source").getConfigItemAsNumber = jest.fn(() => 3600);
    cache = new InProcessResultCache();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should store and retrieve a job", async () => {
    await cache.store("job-1", {
      status: QueryJobStatus.Processing,
      query,
    });

    const job = await cache.get("job-1");
    expect(job).not.toBeNull();
    expect(job?.status).toBe(QueryJobStatus.Processing);
  });

  it("should return null for non-existent job", async () => {
    const job = await cache.get("non-existent");
    expect(job).toBeNull();
  });

  it("should delete a job", async () => {
    await cache.store("job-1", {
      status: QueryJobStatus.Processing,
      query,
    });

    await cache.delete("job-1");
    const job = await cache.get("job-1");
    expect(job).toBeNull();
  });

  it("should expire jobs after TTL", async () => {
    await cache.store("job-1", {
      status: QueryJobStatus.Processing,
      query,
    });

    jest.advanceTimersByTime(3600001);
    const job = await cache.get("job-1");
    expect(job).toBeNull();
  });

  it("should update existing job on store", async () => {
    await cache.store("job-1", {
      status: QueryJobStatus.Processing,
      query,
    });

    await cache.store("job-1", {
      status: QueryJobStatus.Completed,
      result: { test: {} } as any,
    });

    const job = await cache.get("job-1");
    expect(job?.status).toBe(QueryJobStatus.Completed);
    expect(job?.result).toEqual({ test: {} });
  });
});
