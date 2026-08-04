/**
 * @group aws-local-int
 *
 * End-to-end integration tests for Lambda deployment with DynamoDB datastore
 *
 * These tests verify the complete Lambda + DynamoDB stack works correctly
 * when running against MiniStack. They simulate the production deployment
 * where CodeMetrics runs as a Lambda function with DynamoDB as the datastore.
 *
 * Prerequisites:
 * 1. Start Local AWS: docker-compose -f compose/docker-compose-aws-local.yaml up -d
 * 2. Run tests: npm run test:aws-local-int
 */

import serverlessExpress from "@codegenie/serverless-express";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import express, { Express, Request, Response } from "express";
import { DynamoDBClient, ListTablesCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { overrideEnvConfigItem } from "../config/sources/source";
import { getStaticAwsCredentialConfig } from "../utils/awsCredentials";
import { initDynamoDB, DynamoDatastore } from "../db/dynamodb/db";

const AWS_LOCAL_ENDPOINT = "http://localhost:4566";
const AWS_LOCAL_REGION = "us-east-1";

type LambdaApiHandler = (event: APIGatewayProxyEventV2, context: Context) => Promise<APIGatewayProxyStructuredResultV2>;

// Create Lambda event helper
const createEvent = (method: string, path: string, body?: object): APIGatewayProxyEventV2 => ({
  version: "2.0",
  routeKey: "$default",
  rawPath: path,
  rawQueryString: "",
  cookies: [],
  headers: { "content-type": "application/json", host: "lambda.test" },
  queryStringParameters: undefined,
  requestContext: {
    accountId: "123456789012",
    apiId: "test-api",
    domainName: "lambda.test",
    domainPrefix: "lambda",
    http: {
      method,
      path,
      protocol: "HTTP/1.1",
      sourceIp: "127.0.0.1",
      userAgent: "test-agent",
    },
    requestId: `req-${Date.now()}`,
    routeKey: "$default",
    stage: "$default",
    time: new Date().toISOString(),
    timeEpoch: Date.now(),
  },
  body: body ? JSON.stringify(body) : undefined,
  isBase64Encoded: false,
  pathParameters: undefined,
  stageVariables: undefined,
});

const createContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: true,
  functionName: "code-metrics-lambda",
  functionVersion: "$LATEST",
  invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:code-metrics-lambda",
  memoryLimitInMB: "256",
  awsRequestId: `ctx-${Date.now()}`,
  logGroupName: "/aws/lambda/code-metrics-lambda",
  logStreamName: "2024/01/01/[$LATEST]abcdef123456",
  getRemainingTimeInMillis: () => 30000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
});

describe("Lambda + DynamoDB E2E Tests with Local AWS", () => {
  let dynamoClient: DynamoDBClient;
  let datastore: DynamoDatastore;
  let lambdaHandler: LambdaApiHandler;
  const testTablePrefix = "E2ETest_" + Date.now();
  const cacheCollection = "e2e-cache";

  // Create an Express app that uses DynamoDB for caching
  const createAppWithDynamoCache = (): Express => {
    const app = express();
    app.use(express.json());

    // Health check
    app.get("/api/health", (_req: Request, res: Response) => {
      res.json({ status: "healthy", datastore: "dynamodb" });
    });

    // Cache write endpoint
    app.post("/api/cache/:key", async (req: Request, res: Response) => {
      try {
        const { key } = req.params;
        const { value, metadata } = req.body;

        await datastore.connect(cacheCollection, async (table) => {
          await table.insertOne(
            { cacheKey: key },
            { cacheKey: key, value, metadata, timestamp: new Date().toISOString() },
          );
        });

        res.status(201).json({ success: true, key });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Cache read endpoint
    app.get("/api/cache/:key", async (req: Request, res: Response) => {
      try {
        const { key } = req.params;

        const result = await datastore.connect(cacheCollection, async (table) => {
          return table.findOne({ cacheKey: key });
        });

        if (result) {
          res.json({ found: true, data: result });
        } else {
          res.status(404).json({ found: false, key });
        }
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Cache delete endpoint
    app.delete("/api/cache/:key", async (req: Request, res: Response) => {
      try {
        const { key } = req.params;

        await datastore.connect(cacheCollection, async (table) => {
          await table.deleteOne({ cacheKey: key });
        });

        res.json({ success: true, deleted: key });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Cache list endpoint
    app.get("/api/cache", async (_req: Request, res: Response) => {
      try {
        const items = await datastore.connect(cacheCollection, async (table) => {
          return table.listItems();
        });

        res.json({ count: items.length, items });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    return app;
  };

  beforeAll(async () => {
    const endpointUrl = process.env.AWS_ENDPOINT_URL || AWS_LOCAL_ENDPOINT;
    const region = process.env.AWS_REGION || AWS_LOCAL_REGION;

    process.env.AWS_REGION = region;
    process.env.AWS_ENDPOINT_URL = endpointUrl;
    process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
    process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";
    const awsCredentialConfig = getStaticAwsCredentialConfig(
      process.env.AWS_ACCESS_KEY_ID,
      process.env.AWS_SECRET_ACCESS_KEY,
      process.env.AWS_SESSION_TOKEN,
      { preferNodeHttpHandler: true },
    );

    // Configure DynamoDB client for Local AWS
    dynamoClient = new DynamoDBClient({
      region,
      endpoint: endpointUrl,
      ...awsCredentialConfig,
    });

    // Override config for DynamoDB
    overrideEnvConfigItem("AWS_REGION", region);
    overrideEnvConfigItem("AWS_ENDPOINT_URL", endpointUrl);
    overrideEnvConfigItem("DATABASE_NAME", testTablePrefix);
    overrideEnvConfigItem("LOOKUP_CACHE_ENABLED", "true");
    overrideEnvConfigItem("DATASTORE_IMPL", "dynamodb");
    overrideEnvConfigItem("DATASTORE_AUTO_CREATE", "true");
    overrideEnvConfigItem("INVOCATION_MODE", "serve-api");

    // Initialize DynamoDB
    await initDynamoDB();

    // Create datastore instance
    datastore = new DynamoDatastore({
      implName: "dynamodb",
      storeEnabled: true,
      expiryEnabled: false,
      expireAfterSeconds: -1,
      ttlIfToday: -1,
      autoCreate: true,
    });

    // Create Lambda handler
    const app = createAppWithDynamoCache();
    lambdaHandler = serverlessExpress({ app }) as unknown as LambdaApiHandler;
  });

  afterAll(async () => {
    // Clean up test tables
    try {
      const listResult = await dynamoClient.send(new ListTablesCommand({}));
      const testTables = listResult.TableNames?.filter((name) => name.startsWith(testTablePrefix)) || [];

      for (const tableName of testTables) {
        try {
          await dynamoClient.send(new DeleteTableCommand({ TableName: tableName }));
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Health Check via Lambda", () => {
    it("returns healthy status with dynamodb datastore info", async () => {
      const event = createEvent("GET", "/api/health");
      const context = createContext();

      const response = await lambdaHandler(event, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe("healthy");
      expect(body.datastore).toBe("dynamodb");
    });
  });

  describe("Cache Operations via Lambda + DynamoDB", () => {
    const testKey = "test-item-" + Date.now();
    const testValue = { message: "Hello from Lambda", timestamp: Date.now() };

    it("writes cache entry via Lambda to DynamoDB", async () => {
      const event = createEvent("POST", `/api/cache/${testKey}`, {
        value: testValue,
        metadata: { source: "lambda-test" },
      });
      const context = createContext();

      const response = await lambdaHandler(event, context);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.key).toBe(testKey);
    });

    it("reads cache entry via Lambda from DynamoDB", async () => {
      const event = createEvent("GET", `/api/cache/${testKey}`);
      const context = createContext();

      const response = await lambdaHandler(event, context);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.found).toBe(true);
      expect(body.data.cacheKey).toBe(testKey);
      expect(body.data.value).toEqual(testValue);
      expect(body.data.metadata).toEqual({ source: "lambda-test" });
    });

    it("returns 404 for non-existent cache entry", async () => {
      const event = createEvent("GET", "/api/cache/nonexistent-key-xyz");
      const context = createContext();

      const response = await lambdaHandler(event, context);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.found).toBe(false);
    });

    it("deletes cache entry via Lambda from DynamoDB", async () => {
      // First, verify the item exists
      let event = createEvent("GET", `/api/cache/${testKey}`);
      let response = await lambdaHandler(event, createContext());
      expect(response.statusCode).toBe(200);

      // Delete the item
      event = createEvent("DELETE", `/api/cache/${testKey}`);
      response = await lambdaHandler(event, createContext());
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);

      // Verify it's deleted
      event = createEvent("GET", `/api/cache/${testKey}`);
      response = await lambdaHandler(event, createContext());
      expect(response.statusCode).toBe(404);
    });

    it("lists all cache entries via Lambda from DynamoDB", async () => {
      // Create multiple entries
      const entries = [
        { key: `list-test-1-${Date.now()}`, value: "value1" },
        { key: `list-test-2-${Date.now()}`, value: "value2" },
        { key: `list-test-3-${Date.now()}`, value: "value3" },
      ];

      for (const entry of entries) {
        const event = createEvent("POST", `/api/cache/${entry.key}`, { value: entry.value });
        await lambdaHandler(event, createContext());
      }

      // List all entries
      const event = createEvent("GET", "/api/cache");
      const response = await lambdaHandler(event, createContext());

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.count).toBeGreaterThanOrEqual(3);
      expect(body.items).toBeDefined();
    });
  });

  describe("Concurrent Lambda Invocations", () => {
    it("handles concurrent cache operations correctly", async () => {
      const concurrentRequests = 5;
      const promises: Promise<any>[] = [];

      // Create concurrent write requests
      for (let i = 0; i < concurrentRequests; i++) {
        const event = createEvent("POST", `/api/cache/concurrent-${i}`, {
          value: `concurrent-value-${i}`,
          index: i,
        });
        promises.push(lambdaHandler(event, createContext()));
      }

      const responses = await Promise.all(promises);

      // All writes should succeed
      responses.forEach((response, i) => {
        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      });

      // Verify all items were written
      for (let i = 0; i < concurrentRequests; i++) {
        const event = createEvent("GET", `/api/cache/concurrent-${i}`);
        const response = await lambdaHandler(event, createContext());
        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe("Error Handling", () => {
    it("handles gracefully when DynamoDB returns empty result", async () => {
      const event = createEvent("GET", "/api/cache/definitely-not-exists-12345");
      const context = createContext();

      const response = await lambdaHandler(event, context);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.found).toBe(false);
    });
  });
});
