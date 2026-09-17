/**
 * Unit tests for the backend entrypoint in index.ts.
 *
 * These tests cover the entrypoint dispatch in index.ts. detectIfLambda is
 * mocked, so the Lambda vs API branch selection is driven by the mocked
 * detection result rather than by LAMBDA_TASK_ROOT (the real environment
 * detection is covered by entrypoint/__tests__/lambda.spec.ts). They are
 * intentionally ungrouped so they run with the normal unit suite rather than
 * the later LocalStack integration or deploy stages.
 */
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";

type IndexMocks = {
  startup: jest.Mock<() => Promise<void>>;
  buildLambdaHandler: jest.Mock;
  detectIfLambda: jest.Mock;
  logger: jest.Mock;
  error: jest.Mock;
  getConfigItem: jest.Mock<(key: string) => string | undefined>;
};

const originalEnv = { ...process.env };
const originalIsLambda = global.isLambda;
const originalInvocationMode = global.invocationMode;

const createContext = (): Context => ({
  callbackWaitsForEmptyEventLoop: true,
  functionName: "code-metrics-lambda",
  functionVersion: "$LATEST",
  invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:code-metrics-lambda",
  memoryLimitInMB: "256",
  awsRequestId: "ctx-1",
  logGroupName: "/aws/lambda/code-metrics-lambda",
  logStreamName: "2024/01/01/[$LATEST]abcdef123456",
  getRemainingTimeInMillis: () => 30000,
  done: () => undefined,
  fail: () => undefined,
  succeed: () => undefined,
});

const createEvent = (): APIGatewayProxyEventV2 => ({
  version: "2.0",
  routeKey: "$default",
  rawPath: "/api/health/liveness",
  rawQueryString: "",
  cookies: [],
  headers: {
    host: "lambda.test",
  },
  requestContext: {
    accountId: "123456789012",
    apiId: "test-api",
    domainName: "lambda.test",
    domainPrefix: "lambda",
    http: {
      method: "GET",
      path: "/api/health/liveness",
      protocol: "HTTP/1.1",
      sourceIp: "127.0.0.1",
      userAgent: "test-agent",
    },
    requestId: "req-1",
    routeKey: "$default",
    stage: "$default",
    time: new Date().toISOString(),
    timeEpoch: Date.now(),
  },
  isBase64Encoded: false,
  pathParameters: undefined,
  queryStringParameters: undefined,
  stageVariables: undefined,
  body: undefined,
});

const loadIndex = async (options?: { isLambda?: boolean; invocationMode?: string }) => {
  jest.resetModules();

  process.env = { ...originalEnv };

  const startup = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const lambdaHandler = jest
    .fn<() => Promise<{ statusCode: number; body: string }>>()
    .mockResolvedValue({ statusCode: 200, body: "ok" });
  const buildLambdaHandler = jest.fn().mockReturnValue(lambdaHandler);
  const detectIfLambda = jest.fn().mockReturnValue(options?.isLambda ?? false);
  const logger = jest.fn();
  const error = jest.fn();
  const getConfigItem = jest.fn<(key: string) => string | undefined>().mockImplementation((key: string) => {
    if (key === "INVOCATION_MODE") {
      return options?.invocationMode ?? "serve-api";
    }
    return undefined;
  });

  jest.doMock("../entrypoint/startup", () => ({
    startup,
  }));
  jest.doMock("../entrypoint/lambda", () => ({
    buildLambdaHandler,
    detectIfLambda,
  }));
  jest.doMock("../utils/logger/logger", () => ({
    logger,
    error,
  }));
  jest.doMock("../config/sources/source", () => ({
    getConfigItem,
  }));

  // Suppress process.exit calls in tests
  jest.doMock("log-timestamp", () => ({}));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const indexModule = require("../index") as {
    handler?: (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>;
  };

  return {
    indexModule,
    lambdaHandler,
    mocks: {
      startup,
      buildLambdaHandler,
      detectIfLambda,
      logger,
      error,
      getConfigItem,
    } satisfies IndexMocks,
  };
};

describe("index entrypoint", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    global.isLambda = originalIsLambda;
    global.invocationMode = originalInvocationMode;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    global.isLambda = originalIsLambda;
    global.invocationMode = originalInvocationMode;
  });

  it("builds the Lambda handler and skips startup when detection reports Lambda", async () => {
    const { indexModule, mocks } = await loadIndex({
      isLambda: true,
    });

    expect(global.isLambda).toBe(true);
    expect(mocks.detectIfLambda).toHaveBeenCalledTimes(1);
    expect(mocks.buildLambdaHandler).toHaveBeenCalledTimes(1);
    expect(indexModule.handler).toBeDefined();
    expect(mocks.startup).not.toHaveBeenCalled();
  });

  it("calls startup and skips the Lambda handler when detection reports non-Lambda", async () => {
    const { mocks } = await loadIndex({
      isLambda: false,
    });

    expect(global.isLambda).toBe(false);
    expect(mocks.detectIfLambda).toHaveBeenCalledTimes(1);
    expect(mocks.startup).toHaveBeenCalledTimes(1);
    expect(mocks.buildLambdaHandler).not.toHaveBeenCalled();
  });
});
