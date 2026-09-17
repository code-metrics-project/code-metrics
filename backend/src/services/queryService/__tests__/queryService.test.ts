import { QueryService } from "../queryService";
import { getQueryByName } from "../../../queries/config";
import { convertMetricsMapToObj } from "../../../utils/metrics";
import { groupBy } from "../../../utils/grouping";
import { processArgs, applyTransforms } from "../../../routes/query";
import { RawQuery } from "../../../model/query";

jest.mock("../../../queries/config");
jest.mock("../../../utils/metrics");
jest.mock("../../../utils/grouping");
jest.mock("../../../routes/query");

describe("QueryService", () => {
  let service: QueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QueryService();
  });

  it("should execute the full query pipeline", async () => {
    const rawQuery: RawQuery = { queryName: "test-query", args: { workloads: ["wl-1"] } };
    const queryResult = new Map();
    const groupedResult = new Map();
    const transformedResult = new Map();
    const wireFormat = { workload1: {} };

    (getQueryByName as jest.Mock).mockReturnValue({
      execute: jest.fn().mockResolvedValue(queryResult),
    });
    (processArgs as jest.Mock).mockReturnValue({ workloads: ["wl-1"] });
    (groupBy as jest.Mock).mockResolvedValue(groupedResult);
    (applyTransforms as jest.Mock).mockResolvedValue(transformedResult);
    (convertMetricsMapToObj as jest.Mock).mockReturnValue(wireFormat);

    const result = await service.execute(rawQuery);

    expect(getQueryByName).toHaveBeenCalledWith("test-query");
    expect(processArgs).toHaveBeenCalledWith(rawQuery.args);
    expect(groupBy).toHaveBeenCalledWith(rawQuery, queryResult);
    expect(applyTransforms).toHaveBeenCalledWith(rawQuery, groupedResult);
    expect(convertMetricsMapToObj).toHaveBeenCalledWith(transformedResult);
    expect(result).toBe(wireFormat);
  });

  it("should handle query execution errors", async () => {
    const rawQuery: RawQuery = { queryName: "bad-query", args: {} };
    (getQueryByName as jest.Mock).mockReturnValue({
      execute: jest.fn().mockRejectedValue(new Error("Query failed")),
    });

    await expect(service.execute(rawQuery)).rejects.toThrow("Query failed");
  });
});
