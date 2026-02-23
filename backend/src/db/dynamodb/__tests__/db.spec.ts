import { DynamoDatastore, initDynamoDB } from "../db";
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
