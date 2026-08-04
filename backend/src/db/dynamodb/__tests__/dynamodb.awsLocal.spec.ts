/**
 * @group aws-local-int
 * Integration tests for DynamoDB with MiniStack
 *
 * These tests require MiniStack to be running with DynamoDB enabled.
 * Tests will be skipped automatically if MiniStack is not available.
 *
 * To run these tests:
 * 1. Start local AWS: docker-compose -f compose/docker-compose-aws-local.yaml up -d
 * 2. Set environment variables: AWS_REGION=us-east-1 AWS_ENDPOINT_URL=http://localhost:4566
 * 3. Run tests: npm run test:aws-local-int
 */

import { DynamoDBClient, ListTablesCommand, DeleteTableCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { overrideEnvConfigItem } from "../../../config/sources/source";
import { initDynamoDB, DynamoDatastore } from "../db";
import { QueryFilter } from "../../api";
import { getStaticAwsCredentialConfig } from "../../../utils/awsCredentials";

const isMiniStackAvailable = () => !!(process.env.AWS_ENDPOINT_URL || process.env.MINISTACK_ENDPOINT);

const describeIfMiniStack = isMiniStackAvailable() ? describe : describe.skip;

describeIfMiniStack("DynamoDB Datastore with MiniStack", () => {
  let client: DynamoDBClient;
  const testTablePrefix = "TestCodeMetrics_" + Date.now();
  const testCollectionName = "test-collection";

  beforeAll(async () => {
    const endpointUrl = process.env.AWS_ENDPOINT_URL || process.env.MINISTACK_ENDPOINT;
    const region = process.env.AWS_REGION || "us-east-1";
    const awsCredentialConfig = getStaticAwsCredentialConfig(
      process.env.AWS_ACCESS_KEY_ID || "test",
      process.env.AWS_SECRET_ACCESS_KEY || "test",
      process.env.AWS_SESSION_TOKEN,
      { preferNodeHttpHandler: true },
    );

    // Configure client for MiniStack
    client = new DynamoDBClient({
      region,
      ...awsCredentialConfig,
      ...(endpointUrl && { endpoint: endpointUrl }),
    });

    // Override config for tests
    overrideEnvConfigItem("AWS_REGION", region);
    overrideEnvConfigItem("AWS_ENDPOINT_URL", endpointUrl);
    overrideEnvConfigItem("DATABASE_NAME", testTablePrefix);
    overrideEnvConfigItem("LOOKUP_CACHE_ENABLED", "true");
    overrideEnvConfigItem("DATASTORE_IMPL", "dynamodb");
    overrideEnvConfigItem("DATASTORE_AUTO_CREATE", "true");

    // Initialize DynamoDB module
    await initDynamoDB();
  });

  afterAll(async () => {
    // Clean up test tables
    if (isMiniStackAvailable()) {
      try {
        const listResult = await client.send(new ListTablesCommand({}));
        const testTables = listResult.TableNames?.filter((name) => name.startsWith(testTablePrefix)) || [];

        for (const tableName of testTables) {
          try {
            await client.send(new DeleteTableCommand({ TableName: tableName }));
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe("Table Operations", () => {
    it("creates a table when connecting to a new collection", async () => {
      const datastore = new DynamoDatastore({
        implName: "dynamodb",
        storeEnabled: true,
        autoCreate: true,
        expiryEnabled: false,
        expireAfterSeconds: -1,
        ttlIfToday: -1,
      });

      // Perform an operation that creates the table
      const result = await datastore.connect(testCollectionName, async (table) => {
        return table.findOne({ testKey: "nonexistent" });
      });

      expect(result).toBeNull();

      // Verify table was created
      const expectedTableName = `${testTablePrefix}_${testCollectionName}`;
      const describeResult = await client.send(new DescribeTableCommand({ TableName: expectedTableName }));
      expect(describeResult.Table?.TableName).toBe(expectedTableName);
      expect(describeResult.Table?.TableStatus).toBe("ACTIVE");
    });

    it("reuses existing table on subsequent connections", async () => {
      const datastore = new DynamoDatastore({
        implName: "dynamodb",
        storeEnabled: true,
        autoCreate: true,
        expiryEnabled: false,
        expireAfterSeconds: -1,
        ttlIfToday: -1,
      });

      // Connect twice - should not throw or create duplicate tables
      await datastore.connect(testCollectionName, async (table) => {
        return table.findOne({ testKey: "test1" });
      });

      await datastore.connect(testCollectionName, async (table) => {
        return table.findOne({ testKey: "test2" });
      });

      // Count tables with our prefix
      const listResult = await client.send(new ListTablesCommand({}));
      const matchingTables = listResult.TableNames?.filter(
        (name) => name === `${testTablePrefix}_${testCollectionName}`,
      );
      expect(matchingTables?.length).toBe(1);
    });
  });

  describe("CRUD Operations", () => {
    let datastore: DynamoDatastore;
    const crudCollectionName = "crud-test";

    beforeAll(() => {
      datastore = new DynamoDatastore({
        implName: "dynamodb",
        storeEnabled: true,
        autoCreate: true,
        expiryEnabled: false,
        expireAfterSeconds: -1,
        ttlIfToday: -1,
      });
    });

    it("inserts and retrieves an item", async () => {
      const key: QueryFilter = { id: "test-item-1" };
      const item = {
        id: "test-item-1",
        name: "Test Item",
        value: 42,
        nested: { foo: "bar" },
        tags: ["a", "b", "c"],
      };

      // Insert item
      await datastore.connect(crudCollectionName, async (table) => {
        await table.insertOne(key, item);
      });

      // Retrieve item
      const result = await datastore.connect(crudCollectionName, async (table) => {
        return table.findOne(key);
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("test-item-1");
      expect(result.name).toBe("Test Item");
      expect(result.value).toBe(42);
      expect(result.nested).toEqual({ foo: "bar" });
      expect(result.tags).toEqual(["a", "b", "c"]);
    });

    it("updates an existing item by reinserting", async () => {
      const key: QueryFilter = { id: "test-item-update" };
      const originalItem = { id: "test-item-update", value: 1 };
      const updatedItem = { id: "test-item-update", value: 2, newField: "added" };

      // Insert original
      await datastore.connect(crudCollectionName, async (table) => {
        await table.insertOne(key, originalItem);
      });

      // Update by reinserting
      await datastore.connect(crudCollectionName, async (table) => {
        await table.insertOne(key, updatedItem);
      });

      // Verify update
      const result = await datastore.connect(crudCollectionName, async (table) => {
        return table.findOne(key);
      });

      expect(result.value).toBe(2);
      expect(result.newField).toBe("added");
    });

    it("deletes an item", async () => {
      const key: QueryFilter = { id: "test-item-delete" };
      const item = { id: "test-item-delete", data: "to-be-deleted" };

      // Insert item
      await datastore.connect(crudCollectionName, async (table) => {
        await table.insertOne(key, item);
      });

      // Verify it exists
      let result = await datastore.connect(crudCollectionName, async (table) => {
        return table.findOne(key);
      });
      expect(result).toBeDefined();

      // Delete item
      await datastore.connect(crudCollectionName, async (table) => {
        await table.deleteOne(key);
      });

      // Verify deletion
      result = await datastore.connect(crudCollectionName, async (table) => {
        return table.findOne(key);
      });
      expect(result).toBeNull();
    });

    it("lists all items in a collection", async () => {
      const listCollectionName = "list-test-" + Date.now();
      const items = [
        { id: "list-1", name: "Item 1" },
        { id: "list-2", name: "Item 2" },
        { id: "list-3", name: "Item 3" },
      ];

      // Insert multiple items
      for (const item of items) {
        await datastore.connect(listCollectionName, async (table) => {
          await table.insertOne({ id: item.id }, item);
        });
      }

      // List all items
      const result = await datastore.connect(listCollectionName, async (table) => {
        return table.listItems();
      });

      expect(result).toHaveLength(3);
      const names = result.map((r) => r.name).sort();
      expect(names).toEqual(["Item 1", "Item 2", "Item 3"]);
    });
  });

  describe("TTL Configuration", () => {
    it("configures TTL when expiry is enabled", async () => {
      const ttlCollectionName = "ttl-test-" + Date.now();
      const datastore = new DynamoDatastore({
        implName: "dynamodb",
        storeEnabled: true,
        autoCreate: true,
        expiryEnabled: true,
        expireAfterSeconds: 3600,
        ttlIfToday: 3600,
      });

      // Trigger table creation
      await datastore.connect(ttlCollectionName, async (table) => {
        const expiresAt = new Date(Date.now() + 3600 * 1000);
        await table.insertOne({ id: "ttl-item" }, { id: "ttl-item", data: "expires", expiresAt });
      });

      // Verify item was stored with expiry
      const result = await datastore.connect(ttlCollectionName, async (table) => {
        return table.findOne({ id: "ttl-item" });
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("ttl-item");
    });
  });
});
