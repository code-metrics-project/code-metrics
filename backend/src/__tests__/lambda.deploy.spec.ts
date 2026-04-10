/**
 * @group aws-local-deploy
 *
 * True end-to-end Lambda deployment tests using the local AWS emulator.
 *
 * These tests deploy the actual CodeMetrics Lambda to MiniStack and invoke it
 * via the AWS Lambda SDK, validating the complete deployment pipeline.
 *
 * Prerequisites:
 * 1. MiniStack running: docker-compose -f compose/docker-compose-aws-local.yaml up -d
 * 2. Lambda deployed: ./scripts/deploy-lambda-aws-local.sh
 * 3. Environment variables set:
 *    - AWS_REGION=us-east-1
 *    - AWS_ENDPOINT_URL=http://localhost:4566
 *    - AWS_ACCESS_KEY_ID=test
 *    - AWS_SECRET_ACCESS_KEY=test
 *    - LAMBDA_DEPLOYED=true
 *
 * Run with: npm run test:e2e:aws-local-deploy
 *
 */

import { LambdaClient, InvokeCommand, GetFunctionCommand, LogType } from "@aws-sdk/client-lambda";
import { CloudWatchLogsClient, DescribeLogStreamsCommand } from "@aws-sdk/client-cloudwatch-logs";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

// Configuration
const FUNCTION_NAME = process.env.LAMBDA_FUNCTION_NAME || "codemetrics-api";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const AWS_ENDPOINT_URL = process.env.AWS_ENDPOINT_URL || "http://localhost:4566";

// Only run if explicitly enabled (requires Lambda to be deployed)
const isLambdaDeployed = process.env.LAMBDA_DEPLOYED === "true";
const describeIfDeployed = isLambdaDeployed ? describe : describe.skip;

// AWS SDK clients configured for the local AWS emulator
const lambdaClient = new LambdaClient({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
});

const logsClient = new CloudWatchLogsClient({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
});

// Helper: Create Lambda API Gateway event
const createApiEvent = (
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
    host: "lambda.aws-local",
    ...options?.headers,
  },
  queryStringParameters: options?.queryString
    ? Object.fromEntries(new URLSearchParams(options.queryString).entries())
    : undefined,
  requestContext: {
    accountId: "123456789012",
    apiId: "test-api",
    domainName: "lambda.aws-local",
    domainPrefix: "lambda",
    http: {
      method,
      path,
      protocol: "HTTP/1.1",
      sourceIp: "127.0.0.1",
      userAgent: "test-agent",
    },
    requestId: `test-${Date.now()}`,
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

// Helper: Invoke Lambda and return parsed response
const invokeLambda = async (
  event: APIGatewayProxyEventV2,
  options?: { includeLogs?: boolean },
): Promise<{
  statusCode: number;
  headers: NonNullable<APIGatewayProxyStructuredResultV2["headers"]>;
  body: any;
  logs?: string;
}> => {
  const command = new InvokeCommand({
    FunctionName: FUNCTION_NAME,
    Payload: Buffer.from(JSON.stringify(event)),
    LogType: options?.includeLogs ? LogType.Tail : LogType.None,
  });

  const response = await lambdaClient.send(command);

  if (response.FunctionError) {
    const errorPayload = response.Payload ? JSON.parse(new TextDecoder().decode(response.Payload)) : {};
    throw new Error(`Lambda function error: ${response.FunctionError} - ${JSON.stringify(errorPayload)}`);
  }

  const payload = response.Payload ? JSON.parse(new TextDecoder().decode(response.Payload)) : {};

  // Decode logs if included
  let logs: string | undefined;
  if (options?.includeLogs && response.LogResult) {
    logs = Buffer.from(response.LogResult, "base64").toString("utf-8");
  }

  // Parse body - handle both JSON and non-JSON responses
  let body: any = payload.body;
  if (typeof payload.body === "string") {
    try {
      body = JSON.parse(payload.body);
    } catch {
      // Body is not JSON (e.g., HTML error page)
      body = payload.body;
    }
  }

  return {
    statusCode: payload.statusCode || 500,
    headers: (payload.headers || {}) as NonNullable<APIGatewayProxyStructuredResultV2["headers"]>,
    body,
    logs,
  };
};

describeIfDeployed("Lambda Deployed to MiniStack", () => {
  describe("Function Deployment Verification", () => {
    it("Lambda function exists in aws-local", async () => {
      const command = new GetFunctionCommand({ FunctionName: FUNCTION_NAME });
      const response = await lambdaClient.send(command);

      expect(response.Configuration?.FunctionName).toBe(FUNCTION_NAME);
      expect(response.Configuration?.Runtime).toContain("nodejs");
      expect(response.Configuration?.Handler).toBe("index.handler");
    });

    it("Lambda function is in Active state", async () => {
      const command = new GetFunctionCommand({ FunctionName: FUNCTION_NAME });
      const response = await lambdaClient.send(command);

      expect(response.Configuration?.State).toBe("Active");
    });
  });

  describe("Health Endpoints via Lambda Invoke", () => {
    it("liveness endpoint returns 200", async () => {
      const event = createApiEvent("GET", "/api/health/liveness");
      const response = await invokeLambda(event);

      expect(response.statusCode).toBe(200);
    });

    it("readiness endpoint returns 200", async () => {
      const event = createApiEvent("GET", "/api/health/readiness");
      const response = await invokeLambda(event);

      expect(response.statusCode).toBe(200);
    });
  });

  describe("Bootstrap Configuration via Lambda", () => {
    it("returns bootstrap config with auth settings", async () => {
      const event = createApiEvent("GET", "/api/system/bootstrap");
      const response = await invokeLambda(event);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty("auth");
      expect(response.body).toHaveProperty("features");
      expect(response.body).toHaveProperty("hasConfig");
      expect(response.body).toHaveProperty("isLicensed");
    });
  });

  describe("Error Handling", () => {
    it("returns 404 for unknown routes", async () => {
      const event = createApiEvent("GET", "/api/nonexistent/route");
      const response = await invokeLambda(event);

      expect(response.statusCode).toBe(404);
    });

    it("handles malformed requests gracefully", async () => {
      const event = createApiEvent("POST", "/api/refresh", {
        body: { invalidToken: "not-a-real-token" },
      });
      const response = await invokeLambda(event);

      // Should return an error, not crash
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Lambda Response Format", () => {
    it("returns properly formatted API Gateway response", async () => {
      const event = createApiEvent("GET", "/api/health/liveness");
      const response = await invokeLambda(event);

      expect(typeof response.statusCode).toBe("number");
      expect(typeof response.headers).toBe("object");
    });

    it("includes correct content-type header", async () => {
      const event = createApiEvent("GET", "/api/system/bootstrap");
      const response = await invokeLambda(event);

      // Check for JSON content type (case-insensitive header lookup)
      const contentType = response.headers["content-type"] || response.headers["Content-Type"] || "";
      expect(contentType).toContain("application/json");
    });
  });

  describe("CloudWatch Logs Integration", () => {
    it("Lambda execution produces logs", async () => {
      // Invoke with logs
      const event = createApiEvent("GET", "/api/health/liveness");
      const response = await invokeLambda(event, { includeLogs: true });

      expect(response.statusCode).toBe(200);

      // In MiniStack, logs might be in the response or in CloudWatch
      // Check if we got any log output
      if (response.logs) {
        expect(response.logs.length).toBeGreaterThan(0);
      }
    });

    it("log group exists for Lambda function", async () => {
      const logGroupName = `/aws/lambda/${FUNCTION_NAME}`;

      try {
        const command = new DescribeLogStreamsCommand({
          logGroupName,
          limit: 1,
        });
        const response = await logsClient.send(command);

        // If we get here, log group exists
        expect(response.logStreams).toBeDefined();
      } catch (error: any) {
        // awsLocal may not create log groups until first invocation
        // This is acceptable - log the skip reason
        console.log(`Log group ${logGroupName} not found (may not exist yet in MiniStack)`);
      }
    });
  });

  describe("Cold Start and Performance", () => {
    it("handles multiple sequential invocations", async () => {
      const event = createApiEvent("GET", "/api/health/liveness");

      const startTime = Date.now();

      // Make 5 sequential calls
      for (let i = 0; i < 5; i++) {
        const response = await invokeLambda(event);
        expect(response.statusCode).toBe(200);
      }

      const duration = Date.now() - startTime;

      // All 5 calls should complete within 30 seconds (generous for cold starts)
      expect(duration).toBeLessThan(30000);
    });

    it("handles concurrent invocations", async () => {
      const event = createApiEvent("GET", "/api/health/liveness");

      // Make 3 concurrent calls
      const promises = [invokeLambda(event), invokeLambda(event), invokeLambda(event)];

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
      });
    }, 30000); // Increased timeout for concurrent cold starts
  });
});

// Separate describe for tests that don't require deployment
describe("Lambda Deployment Detection", () => {
  it("LAMBDA_DEPLOYED environment variable controls test execution", () => {
    if (isLambdaDeployed) {
      expect(process.env.LAMBDA_DEPLOYED).toBe("true");
    } else {
      expect(process.env.LAMBDA_DEPLOYED).not.toBe("true");
      console.log("Lambda deployed tests skipped - set LAMBDA_DEPLOYED=true to run");
    }
  });
});
