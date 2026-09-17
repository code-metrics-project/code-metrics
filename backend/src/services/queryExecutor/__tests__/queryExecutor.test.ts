import { QueryExecutor } from "../queryExecutor";
import { QueryService } from "../../queryService/queryService";
import { QueryResultCache } from "../../queryResultCache/queryResultCache";
import { QueryJobStatus } from "../../../model/queryJob";
import { RawQuery } from "../../../model/query";

jest.mock("../../../config/sources/source");
jest.mock("../../queryService/queryService");

describe("QueryExecutor", () => {
  let executor: QueryExecutor;
  let mockQueryService: jest.Mocked<QueryService>;
  let mockCache: jest.Mocked<QueryResultCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.requireMock("../../../config/sources/source").getConfigItemAsNumber = jest.fn(() => 3600);

    mockQueryService = {
      execute: jest.fn(),
    } as jest.Mocked<QueryService>;

    mockCache = {
      store: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<QueryResultCache>;

    executor = new QueryExecutor(mockQueryService, mockCache);
  });

  it("should execute query and store completed result", async () => {
    const query: RawQuery = { queryName: "test", args: {} };
    const result = { workload1: {} };
    mockQueryService.execute.mockResolvedValue(result as any);

    await executor.execute("job-1", query);

    expect(mockQueryService.execute).toHaveBeenCalledWith(query);
    expect(mockCache.store).toHaveBeenCalledTimes(2);

    const completedCall = (mockCache.store as jest.Mock).mock.calls[1];
    expect(completedCall[1].status).toBe(QueryJobStatus.Completed);
    expect(completedCall[1].result).toBe(result);
  });

  it("should store failed status when query throws", async () => {
    const query: RawQuery = { queryName: "test", args: {} };
    mockQueryService.execute.mockRejectedValue(new Error("Query failed"));

    await executor.execute("job-1", query);

    expect(mockCache.store).toHaveBeenCalledTimes(2);
    const failedCall = (mockCache.store as jest.Mock).mock.calls[1];
    expect(failedCall[1].status).toBe(QueryJobStatus.Failed);
    expect(failedCall[1].error).toBe("Query failed");
  });

  it("should set processing status before execution", async () => {
    const query: RawQuery = { queryName: "test", args: {} };
    mockQueryService.execute.mockResolvedValue({} as any);

    await executor.execute("job-1", query);

    const processingCall = (mockCache.store as jest.Mock).mock.calls[0];
    expect(processingCall[1].status).toBe(QueryJobStatus.Processing);
  });
});
