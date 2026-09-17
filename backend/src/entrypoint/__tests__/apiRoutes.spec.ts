/**
 * Regression tests for HTTP API route registration in entrypoint/api.ts.
 *
 * The GET /api/admin/remote-connections route was added in #1180 but dropped
 * when app.ts was split into entrypoint/api.ts (#1286). The deployed API then
 * 404'd both the request and its CORS preflight, so the admin Remote
 * Connections page appeared broken by a CORS error.
 */
import { jest, describe, it, expect, beforeAll, afterEach } from "@jest/globals";
import type { Express, Router } from "express";
import { InvocationMode } from "../model";

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean> };
};

const getRegisteredRoutes = (app: Express): Set<string> => {
  const stack = (app.router as unknown as Router & { stack: RouteLayer[] }).stack;
  const routes = new Set<string>();
  for (const layer of stack ?? []) {
    if (!layer.route) {
      continue;
    }
    for (const method of Object.keys(layer.route.methods)) {
      if (layer.route.methods[method]) {
        routes.add(`${method.toUpperCase()} ${layer.route.path}`);
      }
    }
  }
  return routes;
};

const loadApi = async () => {
  jest.resetModules();

  jest.doMock("../../queries/queries", () => ({
    registerQueries: jest.fn(),
  }));
  jest.doMock("../../transforms/transforms", () => ({
    registerTransforms: jest.fn(),
  }));

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const apiModule = require("../api") as unknown as {
    startApi: (invocationMode: InvocationMode, isLambda: boolean) => Promise<Express>;
  };

  return apiModule.startApi(InvocationMode.ServeApi, true);
};

describe("HTTP API route registration", () => {
  let routes: Set<string>;

  beforeAll(async () => {
    const app = await loadApi();
    routes = getRegisteredRoutes(app);
  });

  afterEach(() => {
    jest.resetModules();
  });

  it("registers GET /api/admin/remote-connections", () => {
    expect(routes.has("GET /api/admin/remote-connections")).toBe(true);
  });

  it("still registers the existing admin datastores routes", () => {
    expect(routes.has("GET /api/datastores")).toBe(true);
    expect(routes.has("GET /api/datastores/exists")).toBe(true);
    expect(routes.has("GET /api/datastores/count")).toBe(true);
    expect(routes.has("POST /api/datastores/empty")).toBe(true);
  });

  it("does not register paths that have no route", () => {
    expect(routes.has("GET /api/admin/definitely-not-a-route")).toBe(false);
  });
});
