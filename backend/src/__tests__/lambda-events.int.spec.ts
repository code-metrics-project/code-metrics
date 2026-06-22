/**
 * @group aws-local-int
 *
 * In-Process Lambda Handler Tests for CodeMetrics Application
 *
 * These tests verify that the REAL CodeMetrics Express application works correctly
 * when wrapped with the serverless-express adapter (the same adapter used in Lambda).
 *
 * KEY DISTINCTION:
 * - This file: Runs the app IN-PROCESS via serverless-express, uses MiniStack for DynamoDB + Secrets Manager
 * - lambda.deploy.spec.ts: Deploys to MiniStack Lambda and invokes via AWS SDK
 * - lambda-handler.int.spec.ts: Tests serverless-express with a minimal test Express app
 *
 * What this validates:
 * 1. The real CodeMetrics bootstrap() and startApi() work in a Lambda-like environment
 * 2. Lambda API Gateway event format is correctly parsed by serverless-express
 * 3. DynamoDB + Secrets Manager operations work with MiniStack
 * 4. Health, bootstrap, and error handling endpoints function correctly
 *
 * Entry-point specific startup behavior in index.ts is covered separately by
 * index.spec.ts so this file stays focused on the in-process MiniStack-backed
 * integration path.
 *
 * This is faster than true Lambda deployment but doesn't test:
 * - Actual Lambda cold starts
 * - Lambda runtime environment
 * - CloudWatch logging integration
 *
 * Prerequisites:
 * 1. Start MiniStack: docker-compose -f compose/docker-compose-aws-local.yaml up -d
 * 2. Run tests: npm run test:aws-local-int
 */

import serverlessExpress from "@codegenie/serverless-express";
import { CreateSecretCommand, PutSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, Context } from "aws-lambda";
import { overrideEnvConfigItem } from "../config/sources/source";
import { generateKeyPairSync } from "crypto";
import path from "path";

const AWS_LOCAL_ENDPOINT = "http://localhost:4566";
const AWS_LOCAL_REGION = "us-east-1";

type LambdaApiHandler = (event: APIGatewayProxyEventV2, context: Context) => Promise<APIGatewayProxyStructuredResultV2>;

const createEvent = (
  method: string,
  path: string,
  options?: {
    headers?: Record<string, string>;
    body?: object;
    queryString?: string;
  },
): APIGatewayProxyEventV2 => ({
  version: "2.0",
  routeKey: "$default",
  rawPath: path,
  rawQueryString: options?.queryString || "",
  cookies: [],
  headers: {
    "content-type": "application/json",
    host: "lambda.test",
    ...options?.headers,
  },
  queryStringParameters: options?.queryString
    ? Object.fromEntries(new URLSearchParams(options.queryString).entries())
    : undefined,
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
  body: options?.body ? JSON.stringify(options.body) : undefined,
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

describe("CodeMetrics App via serverless-express (In-Process)", () => {
  let lambdaHandler: LambdaApiHandler;
  let bootstrapComplete = false;

  const upsertSecret = async (client: SecretsManagerClient, name: string, value: string) => {
    try {
      await client.send(
        new CreateSecretCommand({
          Name: name,
          SecretString: value,
        }),
      );
    } catch {
      await client.send(
        new PutSecretValueCommand({
          SecretId: name,
          SecretString: value,
        }),
      );
    }
  };

  beforeAll(async () => {
    // Configure for Lambda-like environment with MiniStack
    const endpointUrl = process.env.AWS_ENDPOINT_URL || AWS_LOCAL_ENDPOINT;
    const region = process.env.AWS_REGION || AWS_LOCAL_REGION;

    process.env.AWS_REGION = region;
    process.env.AWS_ENDPOINT_URL = endpointUrl;
    process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "test";
    process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "test";

    // Seed required remote-config secrets in MiniStack Secrets Manager
    const secretsClient = new SecretsManagerClient({
      region,
      endpoint: endpointUrl,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });

    await upsertSecret(secretsClient, "GITHUB_APP_ID", "123456");
    await upsertSecret(secretsClient, "GITHUB_APP_INSTALLATION_ID", "12345678");
    await upsertSecret(secretsClient, "GITHUB_APP_PRIVATE_KEY", privateKey);
    await upsertSecret(secretsClient, "ANTHROPIC_API_KEY", "test-anthropic-key");
    await upsertSecret(secretsClient, "GOOGLE_AI_API_KEY", "test-google-key");

    // Simulate Lambda environment
    global.isLambda = true;
    global.invocationMode = "serve-api" as any;

    // Configure AWS services for MiniStack
    overrideEnvConfigItem("AWS_REGION", region);
    overrideEnvConfigItem("AWS_ENDPOINT_URL", endpointUrl!);
    overrideEnvConfigItem("SECRET_RESOLVER_IMPL", "secretsmanager");
    overrideEnvConfigItem("DATASTORE_IMPL", "dynamodb");
    overrideEnvConfigItem("DATASTORE_AUTO_CREATE", "true");
    overrideEnvConfigItem("DATABASE_NAME", "LambdaTest_" + Date.now());
    overrideEnvConfigItem("LOOKUP_CACHE_ENABLED", "true");

    // Configure authentication for testing (use file-based auth)
    overrideEnvConfigItem("AUTHENTICATOR_IMPL", "file");
    overrideEnvConfigItem("ACCESS_TOKEN_SECRET", "test-secret-key");

    // Use test config directories (examples + valid license)
    const exampleConfigDir = path.join(__dirname, "../../config/examples");
    const validLicenseConfigDir = path.join(__dirname, "../license/__tests__/test-data/valid");
    overrideEnvConfigItem("CONFIG_DIR", `${exampleConfigDir},${validLicenseConfigDir}`);
    overrideEnvConfigItem("STRICT_CONFIG_LOAD", "false");

    // Import and bootstrap the real app
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { bootstrap, startApi } = require("../app");
      await bootstrap();
      const app = await startApi();
      lambdaHandler = serverlessExpress({ app }) as unknown as LambdaApiHandler;
      bootstrapComplete = true;
    } catch (error) {
      console.error("Failed to bootstrap CodeMetrics app:", error);
      throw error;
    }
  }, 60000); // 60 second timeout for bootstrap

  afterAll(() => {
    global.isLambda = false;
  });

  describe("Health Endpoints", () => {
    it("liveness check returns 200 with empty response", async () => {
      if (!bootstrapComplete) {
        throw new Error("Bootstrap did not complete");
      }

      const event = createEvent("GET", "/api/health/liveness");
      const response = await lambdaHandler(event, createContext());

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({});
    });

    it("readiness check returns 200 with empty response", async () => {
      if (!bootstrapComplete) {
        throw new Error("Bootstrap did not complete");
      }

      const event = createEvent("GET", "/api/health/readiness");
      const response = await lambdaHandler(event, createContext());

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({});
    });
  });

  describe("Bootstrap Endpoint", () => {
    it("returns bootstrap configuration", async () => {
      if (!bootstrapComplete) {
        throw new Error("Bootstrap did not complete");
      }

      const event = createEvent("GET", "/api/system/bootstrap");
      const response = await lambdaHandler(event, createContext());

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // Bootstrap should return auth configuration and features
      expect(body).toHaveProperty("auth");
      expect(body).toHaveProperty("features");
      expect(body).toHaveProperty("hasConfig");
      expect(body).toHaveProperty("isLicensed");
    });
  });

  describe("License-Protected Endpoints", () => {
    it("bootstrap shows isLicensed as true with test license", async () => {
      if (!bootstrapComplete) {
        throw new Error("Bootstrap did not complete");
      }

      const event = createEvent("GET", "/api/system/bootstrap");
      const response = await lambdaHandler(event, createContext());

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.isLicensed).toBe(true);
    });
  });

  describe("Lambda Response Format", () => {
    it("returns properly formatted Lambda response", async () => {
      if (!bootstrapComplete) {
        throw new Error("Bootstrap did not complete");
      }

      const event = createEvent("GET", "/api/health/liveness");
      const response = await lambdaHandler(event, createContext());

      // Verify Lambda response structure
      expect(response).toHaveProperty("statusCode");
      expect(response).toHaveProperty("headers");
      expect(response).toHaveProperty("body");
      expect(typeof response.body).toBe("string");
    });

    it("handles 404 for unknown routes", async () => {
      if (!bootstrapComplete) {
        throw new Error("Bootstrap did not complete");
      }

      const event = createEvent("GET", "/api/unknown/endpoint");
      const response = await lambdaHandler(event, createContext());

      expect(response.statusCode).toBe(404);
    });
  });

  describe("Request Parsing in Lambda Context", () => {
    it("handles JSON POST body correctly", async () => {
      if (!bootstrapComplete) {
        throw new Error("Bootstrap did not complete");
      }

      // Try login endpoint which accepts POST with body
      const event = createEvent("POST", "/api/refresh", {
        body: { refreshToken: "test-token" },
      });
      const response = await lambdaHandler(event, createContext());

      // Should fail auth but at least parse the request
      expect([400, 401, 403]).toContain(response.statusCode);
    });
  });
});
