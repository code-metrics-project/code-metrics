/**
 * Unit tests for the backend entrypoint in index.ts.
 *
 * These tests cover the startup side effects that are specific to the entrypoint,
 * such as Lambda environment detection, CONFIG_DIR override behavior, and lazy
 * handler initialization. They are intentionally ungrouped so they run with the
 * normal unit suite rather than the later LocalStack integration or deploy stages.
 */
import { jest } from "@jest/globals";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";

type IndexMocks = {
  bootstrap: jest.Mock<() => Promise<void>>;
  startApi: jest.Mock<() => Promise<unknown>>;
  serverlessExpress: jest.Mock;
  logger: jest.Mock;
  error: jest.Mock;
  verbose: jest.Mock;
  getEnvConfigItem: jest.Mock;
  overrideEnvConfigItem: jest.Mock;
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

const loadIndex = async (options?: { lambdaTaskRoot?: string; invocationMode?: string }) => {
  jest.resetModules();

  process.env = { ...originalEnv };
  if (options?.lambdaTaskRoot === undefined) {
    delete process.env.LAMBDA_TASK_ROOT;
  } else {
    process.env.LAMBDA_TASK_ROOT = options.lambdaTaskRoot;
  }

  const bootstrap = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const app = { use: jest.fn() };
  const startApi = jest.fn<() => Promise<unknown>>().mockResolvedValue(app);
  const lambdaResponse = { statusCode: 200, body: "ok" };
  const serverlessExpressInstance = jest
    .fn<(event: APIGatewayProxyEventV2, context: Context) => Promise<typeof lambdaResponse>>()
    .mockResolvedValue(lambdaResponse);
  const serverlessExpress = jest.fn().mockReturnValue(serverlessExpressInstance);
  const logger = jest.fn();
  const error = jest.fn();
  const verbose = jest.fn();
  const getEnvConfigItem = jest.fn().mockImplementation((key: string) => {
    if (key === "INVOCATION_MODE") {
      return options?.invocationMode ?? "serve-api";
    }
    return undefined;
  });
  const overrideEnvConfigItem = jest.fn();

  jest.doMock("../app", () => ({
    bootstrap,
    startApi,
  }));
  jest.doMock("@codegenie/serverless-express", () => ({
    __esModule: true,
    default: serverlessExpress,
  }));
  jest.doMock("../utils/logger/logger", () => ({
    logger,
    error,
    verbose,
  }));
  jest.doMock("../config/sources/source", () => ({
    getEnvConfigItem,
    overrideEnvConfigItem,
  }));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const indexModule = require("../index") as {
    handler?: (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>;
  };

  return {
    indexModule,
    app,
    serverlessExpressInstance,
    lambdaResponse,
    mocks: {
      bootstrap,
      startApi,
      serverlessExpress,
      logger,
      error,
      verbose,
      getEnvConfigItem,
      overrideEnvConfigItem,
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

  it("treats LAMBDA_TASK_ROOT as Lambda mode and configures CONFIG_DIR from it", async () => {
    const { indexModule, mocks, app, serverlessExpressInstance, lambdaResponse } = await loadIndex({
      lambdaTaskRoot: "/var/task",
    });

    expect(global.isLambda).toBe(true);
    expect(global.invocationMode).toBe("serve-api");
    expect(mocks.overrideEnvConfigItem).toHaveBeenCalledWith("CONFIG_DIR", "/var/task/config");
    expect(mocks.verbose).toHaveBeenCalledWith("Running in AWS Lambda environment with task root:", "/var/task");
    expect(mocks.bootstrap).not.toHaveBeenCalled();
    expect(mocks.startApi).not.toHaveBeenCalled();

    const handler = indexModule.handler;
    expect(handler).toBeDefined();

    const response = await handler!(createEvent(), createContext());

    expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
    expect(mocks.startApi).toHaveBeenCalledTimes(1);
    expect(mocks.serverlessExpress).toHaveBeenCalledWith({ app });
    expect(serverlessExpressInstance).toHaveBeenCalledTimes(1);
    expect(response).toBe(lambdaResponse);
  });

  it("treats missing LAMBDA_TASK_ROOT as non-Lambda mode and does not override CONFIG_DIR", async () => {
    const { mocks } = await loadIndex({
      lambdaTaskRoot: undefined,
    });

    expect(global.isLambda).toBe(false);
    expect(mocks.overrideEnvConfigItem).not.toHaveBeenCalledWith("CONFIG_DIR", expect.anything());
    expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
    expect(mocks.startApi).toHaveBeenCalledTimes(1);
  });
});
