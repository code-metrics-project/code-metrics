/**
 * Unit tests for the startup dispatch in entrypoint/startup.ts.
 *
 * The ExecuteQuery branch must populate the query and transform registries
 * before bootstrapping, otherwise the async query execution Lambda cannot
 * resolve any named query (the HTTP API entrypoint registers them separately).
 */
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { InvocationMode } from "../model";

type StartupMocks = {
  startApi: jest.Mock;
  bootstrap: jest.Mock;
  registerQueries: jest.Mock;
  registerTransforms: jest.Mock;
  overrideConfigItem: jest.Mock;
};

const callOrder: string[] = [];

const recordingMock = (name: string) =>
  jest.fn(async () => {
    callOrder.push(name);
  });

const loadStartup = async () => {
  jest.resetModules();

  const startApi = jest.fn().mockResolvedValue({});
  const bootstrap = recordingMock("bootstrap");
  const registerQueries = recordingMock("registerQueries");
  const registerTransforms = recordingMock("registerTransforms");
  const overrideConfigItem = jest.fn();

  jest.doMock("../api", () => ({
    startApi,
  }));
  jest.doMock("../bootstrap", () => ({
    bootstrap,
  }));
  jest.doMock("../../queries/queries", () => ({
    registerQueries,
  }));
  jest.doMock("../../transforms/transforms", () => ({
    registerTransforms,
  }));
  jest.doMock("../../config/sources/source", () => ({
    overrideConfigItem,
  }));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const startupModule = require("../startup") as unknown as {
    startup: (invocationMode: InvocationMode, isLambda?: boolean) => Promise<unknown>;
  };

  return {
    startup: startupModule.startup,
    mocks: {
      startApi,
      bootstrap,
      registerQueries,
      registerTransforms,
      overrideConfigItem,
    } satisfies StartupMocks,
  };
};

describe("startup", () => {
  beforeEach(() => {
    callOrder.length = 0;
  });

  afterEach(() => {
    jest.resetModules();
  });

  it("registers queries and transforms before bootstrap in ExecuteQuery mode", async () => {
    const { startup, mocks } = await loadStartup();

    await startup(InvocationMode.ExecuteQuery, true);

    expect(mocks.registerQueries).toHaveBeenCalledTimes(1);
    expect(mocks.registerTransforms).toHaveBeenCalledTimes(1);
    expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
    expect(callOrder.indexOf("registerQueries")).toBeLessThan(callOrder.indexOf("bootstrap"));
    expect(callOrder.indexOf("registerTransforms")).toBeLessThan(callOrder.indexOf("bootstrap"));
    expect(mocks.startApi).not.toHaveBeenCalled();
  });

  it("does not register queries or transforms in ServeApi mode (the API entrypoint does)", async () => {
    const { startup, mocks } = await loadStartup();

    await startup(InvocationMode.ServeApi, true);

    expect(mocks.registerQueries).not.toHaveBeenCalled();
    expect(mocks.registerTransforms).not.toHaveBeenCalled();
    expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
    expect(mocks.startApi).toHaveBeenCalledTimes(1);
  });

  it("does not register queries or transforms in UpdateCache mode", async () => {
    const { startup, mocks } = await loadStartup();

    await startup(InvocationMode.UpdateCache, true);

    expect(mocks.registerQueries).not.toHaveBeenCalled();
    expect(mocks.registerTransforms).not.toHaveBeenCalled();
    expect(mocks.bootstrap).toHaveBeenCalledTimes(1);
    expect(mocks.startApi).not.toHaveBeenCalled();
  });
});
