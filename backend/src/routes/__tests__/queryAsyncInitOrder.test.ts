/**
 * Regression test for the queue/result-cache selection in the async query
 * routes.
 *
 * The route module is imported as part of the bundle import chain, which runs
 * before main() in index.ts sets global.isLambda. If the routes resolved the
 * queue and result cache at module load (eagerly), the factories would always
 * pick the in-process implementations even in Lambda mode, so jobs would be
 * enqueued to an in-memory queue that nothing consumes. These tests assert
 * that the factories are only invoked when a request is handled.
 */
import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { Request, Response } from "express";

const fakeQueue = {
  enqueue: jest.fn().mockResolvedValue(undefined),
};

const fakeCache = {
  store: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(undefined),
};

const originalEnv = { ...process.env };
const originalIsLambda = global.isLambda;

describe("queryAsync initialisation order", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock("../../services/queryQueue/queueFactory", () => ({
      provideQueryQueue: jest.fn(() => fakeQueue),
    }));
    jest.doMock("../../services/queryResultCache/cacheFactory", () => ({
      provideQueryResultCache: jest.fn(() => fakeCache),
    }));
    process.env = { ...originalEnv };
    global.isLambda = originalIsLambda;
  });

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    global.isLambda = originalIsLambda;
  });

  it("does not resolve the queue or result cache at module load", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const routeModule = require("../queryAsync") as unknown as {
      submitAsyncQuery: (req: Request, res: Response) => Promise<void>;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const queueFactory = require("../../services/queryQueue/queueFactory") as unknown as {
      provideQueryQueue: jest.Mock;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cacheFactory = require("../../services/queryResultCache/cacheFactory") as unknown as {
      provideQueryResultCache: jest.Mock;
    };

    expect(typeof routeModule.submitAsyncQuery).toBe("function");
    expect(queueFactory.provideQueryQueue).not.toHaveBeenCalled();
    expect(cacheFactory.provideQueryResultCache).not.toHaveBeenCalled();
  });

  it("resolves the queue and result cache when a request is handled in Lambda mode", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const routeModule = require("../queryAsync") as unknown as {
      submitAsyncQuery: (req: Request, res: Response) => Promise<void>;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const queueFactory = require("../../services/queryQueue/queueFactory") as unknown as {
      provideQueryQueue: jest.Mock;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cacheFactory = require("../../services/queryResultCache/cacheFactory") as unknown as {
      provideQueryResultCache: jest.Mock;
    };

    // main() marks the process as running in Lambda before the first request.
    global.isLambda = true;

    const jsonSpy = jest.fn();
    const req = {
      body: { queryName: "test", args: {} },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnValue({ json: jsonSpy }),
    } as unknown as Response;

    await routeModule.submitAsyncQuery(req, res);

    expect(queueFactory.provideQueryQueue).toHaveBeenCalledTimes(1);
    expect(cacheFactory.provideQueryResultCache).toHaveBeenCalledTimes(1);
    expect(fakeQueue.enqueue).toHaveBeenCalledWith(expect.any(String), { queryName: "test", args: {} });
  });
});
