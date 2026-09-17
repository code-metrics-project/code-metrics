import fs from "node:fs";
import path from "node:path";
import express, { Express } from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { liveness, readiness } from "../routes/health";
import { manageCache } from "../routes/system";
import { findCodeHotspots } from "../routes/codeHotspots";
import { findTemporalCoupling } from "../routes/temporalCoupling";
import { getIssueTypes } from "../routes/issueTypes";
import { fetchBugHistory } from "../routes/tickets";
import { fileMetricBreakdown } from "../routes/codeAnalysisBreakdown";
import { codeAnalysisHistoryAsCsv, codeAnalysisHistoryAsJson } from "../routes/codeAnalysisHistory";
import { codeAnalysisAggregate } from "../routes/codeAnalysisAggregate";
import { vcsPROpenTime, vcsRepoChanges, vcsRepoChurn, vcsRepoChangesSummary } from "../routes/vcs";
import { logger } from "../utils/logger/logger";
import { getPipelineDeployments, getPipelineRun, getPipelineRunRedirect, getPipelineRuns } from "../routes/pipelines";
import { getDependencyAlerts } from "../routes/dependencyAlerts";
import { fetchBootstrap, fetchConfig } from "../routes/config";
import { registerQueries } from "../queries/queries";
import { executeQuery } from "../routes/query";
import { submitAsyncQuery, getAsyncResult } from "../routes/queryAsync";
import { registerTransforms } from "../transforms/transforms";
import { QueryWorker } from "../services/queryWorker/queryWorker";
import { provideQueryQueue } from "../services/queryQueue/queueFactory";
import { QueryExecutor } from "../services/queryExecutor/queryExecutor";
import { QueryService } from "../services/queryService/queryService";
import { provideQueryResultCache } from "../services/queryResultCache/cacheFactory";
import { getDashboard, getDashboards } from "../routes/dashboards";
import { predictLinear } from "../routes/prediction";
import { doIfFeatureActive, Features } from "../utils/features";
import { persistVulnerabilities } from "../routes/vulnerabilities";
import {
  deleteQueryCollection,
  getQueryCollection,
  listQueryCollections,
  saveQueryCollection,
} from "../routes/savedQueries";
import { getAuthenticator } from "../auth/auth";
import { getCorsOrigin } from "../utils/server";
import {
  generateServiceToken,
  listServiceTokenIds,
  logout,
  refreshSession,
  revokeServiceToken,
} from "../routes/authentication";
import { SecureRouter } from "../routes/router";
import { InvocationMode } from "./model";
import { fetchQualityGates } from "../routes/qualityGates";
import { getConfigItem, getConfigItemAsNumber } from "../config/sources/source";
import { ensureConfigLoaded } from "../config/config";
import { buildOpenAPIValidator, openAPIErrorHandler } from "../middleware/openAPIValidator";
import { areAccessLogsEnabled } from "../utils/accessLogging";
import {
  countDatastoreItems,
  datastoreExists,
  emptyDatastore,
  listDatastores,
} from "../routes/admin/datastores";
import { checkRemoteConnections } from "../routes/admin/remoteConnections";

const LAZY_LOAD_CONFIG_DISABLED = getConfigItem("LAZY_LOAD_CONFIG_DISABLED") === "true";

let queryWorker: QueryWorker | null = null;

/**
 * Middleware to ensure configuration is loaded before handling requests.
 * Checks cache TTL and reloads if expired.
 */
const ensureConfigMiddleware = async (req, res, next) => {
  try {
    await ensureConfigLoaded();
    next();
  } catch (e) {
    logger("Failed to ensure config loaded", e);
    next(e);
  }
};

const initApi = async (isLambda: boolean): Promise<Express> => {
  registerQueries();
  registerTransforms();

  const app = express();
  if (areAccessLogsEnabled()) {
    app.use(morgan("combined"));
  }
  app.use(cookieParser());

  const authenticator = getAuthenticator();
  await authenticator.initialise(app);

  // Ensure config is loaded on every request (with TTL caching)
  if (!LAZY_LOAD_CONFIG_DISABLED) {
    app.use(ensureConfigMiddleware);
  }

  if (!isLambda) {
    const corsOrigin = getCorsOrigin();
    logger(`Using CORS origin: ${corsOrigin}`);

    // see https://expressjs.com/en/resources/middleware/cors.html
    const corsOptions = {
      origin: corsOrigin,
      credentials: true,
      optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    };
    app.use(cors(corsOptions));
  }

  app.use(express.json());
  // In dev (Jest), __dirname is src/entrypoint/, spec is at src/openapi/
  // In bundled Lambda, __dirname is dist/, spec is at dist/openapi/
  const specParent = fs.existsSync(path.join(__dirname, "openapi")) ? __dirname : path.resolve(__dirname, "..");
  app.use(buildOpenAPIValidator(specParent));
  app.use(openAPIErrorHandler);
  addRoutes(new SecureRouter(app));
  return app;
};

const addRoutes = (router: SecureRouter) => {
  // health check
  router.addUnauthenticatedRoute("get", "/api/health/liveness", liveness);
  router.addUnauthenticatedRoute("get", "/api/health/readiness", readiness);

  // System
  router.addRoute("post", "/api/system/cache", manageCache);

  // auth
  const authenticator = getAuthenticator();
  authenticator.configureRoutes(router);
  router.addUnauthenticatedRoute("post", "/api/refresh", refreshSession);
  router.addUnauthenticatedRoute("get", "/api/logout", logout);

  // service token endpoints can't be used with service tokens themselves; we only allow access tokens.
  // additionally, these routes require the 'admin' role.
  router.addRouteWithOptions("post", "/api/tokens", { tokenTypes: ["access_token"], requiredRoles: ["admin"] }, generateServiceToken);
  router.addRouteWithOptions("get", "/api/tokens", { tokenTypes: ["access_token"], requiredRoles: ["admin"] }, listServiceTokenIds);
  router.addRouteWithOptions("delete", "/api/tokens/:tokenId", { tokenTypes: ["access_token"], requiredRoles: ["admin"] }, revokeServiceToken);

  // config
  router.addUnauthenticatedRoute("get", "/api/system/bootstrap", fetchBootstrap);
  router.addRoute("get", "/api/system/config", fetchConfig);

  // stored queries
  router.addRoute("get", "/api/queries", listQueryCollections);
  router.addRoute("get", "/api/queries/:collectionId", getQueryCollection);
  router.addRoute("put", "/api/queries/:collectionId", saveQueryCollection);
  router.addRoute("delete", "/api/queries/:collectionId", deleteQueryCollection);

  // pipeline
  router.addRoute("get", "/api/pipeline/deployments", getPipelineDeployments);
  router.addRoute("get", "/api/pipeline/runs", getPipelineRuns);
  router.addRoute("get", "/api/pipeline/run", getPipelineRun);
  router.addRoute("get", "/api/pipeline/redirect", getPipelineRunRedirect);

  // workloads
  router.addRoute("get", "/api/workloads/:workloadId/issue-types", getIssueTypes);

  // tickets
  router.addRoute("get", "/api/tickets/bugs", fetchBugHistory);

  // codebase
  router.addRoute("post", "/api/codebase/metrics", codeAnalysisHistoryAsJson);
  router.addRoute("get", "/api/codebase/metrics.csv", codeAnalysisHistoryAsCsv);
  router.addRoute("post", "/api/codebase/aggregate", codeAnalysisAggregate);
  router.addRoute("get", "/api/codebase/breakdown", fileMetricBreakdown);

  // vcs
  router.addRoute("get", "/api/vcs/churn", vcsRepoChurn);
  router.addRoute("get", "/api/vcs/pr-open-time", vcsPROpenTime);
  router.addRoute("get", "/api/vcs/changes", vcsRepoChanges);
  router.addRoute("get", "/api/vcs/changes/summary", vcsRepoChangesSummary);

  // analysis
  router.addRoute("post", "/api/analysis/code-hotspots", findCodeHotspots);

  doIfFeatureActive(Features.temporalCoupling, () => {
    router.addRoute("post", "/api/analysis/temporal-coupling", findTemporalCoupling);
  });

  // query
  router.addRoute("post", "/api/query", executeQuery);
  router.addRoute("post", "/api/query/async", submitAsyncQuery);
  router.addRoute("get", "/api/query/async/:jobId", getAsyncResult);

  // quality-gates
  router.addRoute("post", "/api/quality-gates", fetchQualityGates);

  // dashboards
  router.addRoute("get", "/api/dashboards", getDashboards);
  router.addRoute("get", "/api/dashboards/:id", getDashboard);

  doIfFeatureActive(Features.predictions, () => {
    router.addRoute("post", "/api/prediction/linear", predictLinear);
  });

  // security
  router.addRoute("post", "/api/security/vulnerabilities", persistVulnerabilities);
  router.addRoute("get", "/api/security/dependency-alerts", getDependencyAlerts);

  // admin - datastores
  // these routes require the 'admin' role, but can be used with any token type (including service tokens).
  router.addRouteWithOptions("get", "/api/datastores", { requiredRoles: ["admin"] }, listDatastores);
  router.addRouteWithOptions("get", "/api/datastores/exists", { requiredRoles: ["admin"] }, datastoreExists);
  router.addRouteWithOptions("get", "/api/datastores/count", { requiredRoles: ["admin"] }, countDatastoreItems);
  router.addRouteWithOptions("post", "/api/datastores/empty", { requiredRoles: ["admin"] }, emptyDatastore);

  // admin - remote connections
  router.addRouteWithOptions("get", "/api/admin/remote-connections", { requiredRoles: ["admin"] }, checkRemoteConnections);
};

/**
 * Entrypoint that serves an HTTP API.
 * @returns 
 */
export const startApi = async (invocationMode: InvocationMode, isLambda: boolean): Promise<Express> => {
  const app = await initApi(isLambda);
  if (isLambda) {
    logger(`CodeMetrics API ready`);
  } else {
    const listenPort = getConfigItemAsNumber("PORT", 3000) as number;
    const listenHost =
      invocationMode === InvocationMode.DesktopMode ? "localhost" : getConfigItem("ADDR", "0.0.0.0") as string;

    app.listen(listenPort, listenHost, () => {
      logger(`CodeMetrics API listening on ${listenHost}:${listenPort}`);
    });

    const queue = provideQueryQueue();
    const cache = provideQueryResultCache();
    const executor = new QueryExecutor(new QueryService(), cache);
    const concurrency = getConfigItemAsNumber("ASYNC_QUERY_WORKER_CONCURRENCY", 1) as number;
    queryWorker = new QueryWorker(queue, executor, concurrency);
    queryWorker.start();
  }
  return app;
};
