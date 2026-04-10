import { DynamoDatastore, initDynamoDB, dynamoAdmin } from "../db";
import { DatastoreConfig, DO_NOT_EXPIRE } from "../../api";
import { overrideConfigItem } from "../../../config/sources/source";

// Mock the AWS SDK
const mockSend = jest.fn();
jest.mock("@aws-sdk/client-dynamodb", () => {
  const actual = jest.requireActual("@aws-sdk/client-dynamodb");
  return {
    ...actual,
    DynamoDBClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
  };
});

// Mock logger to suppress output in tests
jest.mock("../../../utils/logger/logger", () => ({
  logger: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
}));

const buildConfig = (overrides: Partial<DatastoreConfig> = {}): DatastoreConfig => ({
  implName: "dynamodb",
  storeEnabled: true,
  expiryEnabled: false,
  autoCreate: true,
  expireAfterSeconds: DO_NOT_EXPIRE,
  ttlIfToday: DO_NOT_EXPIRE,
  ...overrides,
});

describe("DynamoDatastore", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    overrideConfigItem("AWS_REGION", "us-east-1");
    overrideConfigItem("DATABASE_NAME", "TestDB");
    await initDynamoDB();
  });

  describe("auto-creation", () => {
    it("should create a table when it does not exist and autoCreate is true", async () => {
      // First call: DescribeTable -> not found (table doesn't exist)
      // Second call: CreateTable -> success
      // Third call: DescribeTable -> table is active
      mockSend
        .mockRejectedValueOnce(Object.assign(new Error("not found"), { name: "ResourceNotFoundException" }))
        .mockResolvedValueOnce({}) // CreateTable
        .mockResolvedValueOnce({ Table: { TableName: "TestDB_testTable", TableStatus: "ACTIVE" } }); // DescribeTable (waitForActive)

      const ds = new DynamoDatastore(buildConfig({ autoCreate: true }));
      const result = await ds.connect("testTable", async (table) => {
        return table.tableName;
      });

      expect(result).toBe("TestDB_testTable");
      // Verify CreateTable was called (second call)
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it("should throw an error when table does not exist and autoCreate is false", async () => {
      // DescribeTable -> not found
      mockSend.mockRejectedValueOnce(
        Object.assign(new Error("not found"), { name: "ResourceNotFoundException" }),
      );

      const ds = new DynamoDatastore(buildConfig({ autoCreate: false }));
      await expect(ds.connect("testTable", async () => "result")).rejects.toThrow(
        "Table 'TestDB_testTable' does not exist and DATASTORE_AUTO_CREATE is disabled. Create the table manually or set DATASTORE_AUTO_CREATE=true.",
      );
    });

    it("should succeed without creating table when it already exists and autoCreate is false", async () => {
      // DescribeTable -> exists
      // DescribeTable (waitForActive) -> active
      mockSend
        .mockResolvedValueOnce({ Table: { TableName: "TestDB_testTable" } }) // doesTableExist
        .mockResolvedValueOnce({ Table: { TableName: "TestDB_testTable", TableStatus: "ACTIVE" } }); // waitForActiveTable

      const ds = new DynamoDatastore(buildConfig({ autoCreate: false }));
      const result = await ds.connect("testTable", async (table) => {
        return table.tableName;
      });

      expect(result).toBe("TestDB_testTable");
      // Should only have called DescribeTable twice, no CreateTable
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("should succeed without creating table when it already exists and autoCreate is true", async () => {
      // DescribeTable -> exists
      // DescribeTable (waitForActive) -> active
      mockSend
        .mockResolvedValueOnce({ Table: { TableName: "TestDB_testTable" } }) // doesTableExist
        .mockResolvedValueOnce({ Table: { TableName: "TestDB_testTable", TableStatus: "ACTIVE" } }); // waitForActiveTable

      const ds = new DynamoDatastore(buildConfig({ autoCreate: true }));
      const result = await ds.connect("testTable", async (table) => {
        return table.tableName;
      });

      expect(result).toBe("TestDB_testTable");
      // Should only have called DescribeTable twice, no CreateTable
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});

describe("DynamoAdmin", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    overrideConfigItem("AWS_REGION", "us-east-1");
    overrideConfigItem("DATABASE_NAME", "TestDB");
    await initDynamoDB();
  });

  it("should list collections with prefix stripped", async () => {
    mockSend.mockResolvedValueOnce({
      TableNames: ["TestDB_cache-a", "TestDB_cache-b", "OtherPrefix_ignored"],
      LastEvaluatedTableName: undefined,
    });

    const result = await dynamoAdmin.listCollections();
    expect(result).toEqual(["cache-a", "cache-b"]);
  });

  it("should return empty list when no matching tables", async () => {
    mockSend.mockResolvedValueOnce({
      TableNames: ["OtherPrefix_table1"],
      LastEvaluatedTableName: undefined,
    });

    const result = await dynamoAdmin.listCollections();
    expect(result).toEqual([]);
  });

  it("should paginate when listing tables", async () => {
    mockSend
      .mockResolvedValueOnce({
        TableNames: ["TestDB_page1"],
        LastEvaluatedTableName: "TestDB_page1",
      })
      .mockResolvedValueOnce({
        TableNames: ["TestDB_page2"],
        LastEvaluatedTableName: undefined,
      });

    const result = await dynamoAdmin.listCollections();
    expect(result).toEqual(["page1", "page2"]);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("should check collection existence — exists", async () => {
    mockSend.mockResolvedValueOnce({
      Table: { TableName: "TestDB_myTable" },
    });

    const result = await dynamoAdmin.collectionExists("myTable");
    expect(result).toBe(true);
  });

  it("should check collection existence — does not exist", async () => {
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error("not found"), { name: "ResourceNotFoundException" }),
    );

    const result = await dynamoAdmin.collectionExists("missing");
    expect(result).toBe(false);
  });

  it("should count items in a table", async () => {
    mockSend.mockResolvedValueOnce({
      Count: 15,
      LastEvaluatedKey: undefined,
    });

    const result = await dynamoAdmin.countItems("myTable");
    expect(result).toBe(15);
  });

  it("should return 0 for count on non-existent table", async () => {
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error("not found"), { name: "ResourceNotFoundException" }),
    );

    const result = await dynamoAdmin.countItems("missing");
    expect(result).toBe(0);
  });

  it("should paginate when counting items", async () => {
    mockSend
      .mockResolvedValueOnce({
        Count: 10,
        LastEvaluatedKey: { CacheKey: { S: "last" } },
      })
      .mockResolvedValueOnce({
        Count: 5,
        LastEvaluatedKey: undefined,
      });

    const result = await dynamoAdmin.countItems("myTable");
    expect(result).toBe(15);
  });

  it("should empty a collection by scanning and batch-deleting", async () => {
    // Scan returns 2 items
    mockSend
      .mockResolvedValueOnce({
        Items: [
          { CacheKey: { S: "key1" } },
          { CacheKey: { S: "key2" } },
        ],
        LastEvaluatedKey: undefined,
      })
      // BatchWriteItem succeeds
      .mockResolvedValueOnce({});

    await dynamoAdmin.emptyCollection("myTable");

    // 1 scan + 1 batch delete
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("should not throw when emptying a non-existent table", async () => {
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error("not found"), { name: "ResourceNotFoundException" }),
    );

    await expect(dynamoAdmin.emptyCollection("missing")).resolves.toBeUndefined();
  });
});
