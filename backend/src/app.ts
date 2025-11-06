import express, { Express } from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { liveness, readiness } from "./routes/health";
import { manageCache } from "./routes/system";
import { findBugCulprits } from "./routes/bugCulprits";
import { fetchBugHistory } from "./routes/tickets";
import { fileMetricBreakdown } from "./routes/codeAnalysisBreakdown";
import { codeAnalysisHistoryAsCsv, codeAnalysisHistoryAsJson } from "./routes/codeAnalysisHistory";
import { codeAnalysisAggregate } from "./routes/codeAnalysisAggregate";
import { vcsPROpenTime, vcsRepoChanges, vcsRepoChurn } from "./routes/vcs";
import { logger } from "./utils/logger/logger";
import { getPipelineDeployments, getPipelineRun, getPipelineRunRedirect, getPipelineRuns } from "./routes/pipelines";
import { getDependencyAlerts } from "./routes/dependencyAlerts";
import { fetchBootstrap, fetchConfig } from "./routes/config";
import { loadConfig } from "./config/config";
import { initAdoPipelines } from "./services/pipelines/azure";
import { initGithubPipelines } from "./services/pipelines/github";
import { initJenkinsPipelines } from "./services/pipelines/jenkins";
import { registerQueries } from "./queries/queries";
import { executeQuery } from "./routes/query";
import { registerTransforms } from "./transforms/transforms";
import { initAdoVcs } from "./services/codeManagement/azure";
import { initGithubVcs } from "./services/codeManagement/github";
import { initAdoIssues } from "./services/projectManangement/azure";
import { initJiraIssues } from "./services/projectManangement/jira";
import { initBitbucketCloudVcs } from "./services/codeManagement/bitbucket-cloud";
import { initBitbucketServerVcs } from "./services/codeManagement/bitbucket-server";
import { getDashboard, getDashboards } from "./routes/dashboards";
import { initVcs } from "./services/codeManagement/vcsService";
import { initDatastore } from "./db/factory";
import { predictLinear } from "./routes/prediction";
import { doIfFeatureActive, Features } from "./utils/features";
import { persistVulnerabilities } from "./routes/vulnerabilities";
import { validateLicense } from "./license/validate";
import { initSonar } from "./services/codeAnalysis/sonar";
import { initNoOpCodeAnalysis } from "./services/codeAnalysis/noop";
import {
  deleteQueryCollection,
  getQueryCollection,
  listQueryCollections,
  saveQueryCollection,
} from "./routes/savedQueries";
import { getAuthenticator } from "./auth/auth";
import { getCorsOrigin } from "./utils/server";
import {
  generateServiceToken,
  listServiceTokenIds,
  logout,
  refreshSession,
  revokeServiceToken,
} from "./routes/authentication";
import { initCodePipelinePipelines } from "./services/pipelines/codepipeline";
import { initDynatracePipelines } from "./services/pipelines/dynatrace";
import { SecureRouter } from "./routes/router";
import { initAdoIncidents } from "./services/incidentManagement/azure";
import { initJiraIncidents } from "./services/incidentManagement/jira";
import { initServiceNowIncidents } from "./services/incidentManagement/servicenow";
import { initNoOpPipelines } from "./services/pipelines/noop";
import { initNoOpIncidents } from "./services/incidentManagement/noop";
import { initNoOpIssues } from "./services/projectManangement/noop";
import { InvocationMode } from "./model/global";
import { fetchQualityGates } from "./routes/qualityGates";
import { getConfigItem, getConfigItemAsBoolean, getConfigItemAsNumber } from "./config/sources/source";
import { buildOpenAPIValidator, openAPIErrorHandler } from "./middleware/openAPIValidator";
import { initGithubDependencyAlerts } from "./services/dependencyAlerts/github";
import { initNoopDependencyAlerts } from "./services/dependencyAlerts/noop";

const CONFIG_REFRESH_MS = getConfigItemAsNumber("CONFIG_REFRESH_MS", 30000);
const configReloadFlag = getConfigItemAsBoolean("CONFIG_AUTO_RELOAD");

/**
 * Wrapper to load configuration files, initialise services and connections.
 */
const initServices = async (): Promise<void> => {
  await loadConfig();
  await initDatastore();
  await initVcsProviders();
  initProjectMgmtProviders();
  initPipelineProviders();
  initCodeAnalysisProviders();
  initIncidentMgmtProviders();
  initDependencyAlertsProviders();

  if (configReloadFlag) {
    logger(`Reloading config in ${CONFIG_REFRESH_MS / 1000}s`);
  }
};

async function initVcsProviders() {
  initAdoVcs();
  initGithubVcs();
  initBitbucketCloudVcs();
  initBitbucketServerVcs();
  await initVcs();
}

function initProjectMgmtProviders() {
  initAdoIssues();
  initJiraIssues();
  initNoOpIssues();
}

function initPipelineProviders() {
  initAdoPipelines();
  initCodePipelinePipelines();
  initDynatracePipelines();
  initGithubPipelines();
  initJenkinsPipelines();
  initNoOpPipelines();
}

function initCodeAnalysisProviders() {
  initNoOpCodeAnalysis();
  initSonar();
}

function initIncidentMgmtProviders() {
  initAdoIncidents();
  initJiraIncidents();
  initNoOpIncidents();
  initServiceNowIncidents();
}

function initDependencyAlertsProviders() {
  initGithubDependencyAlerts();
  initNoopDependencyAlerts();
}

const initApi = async (): Promise<Express> => {
  registerQueries();
  registerTransforms();

  const app = express();
  app.use(morgan("combined"));
  app.use(cookieParser());

  const authenticator = getAuthenticator();
  await authenticator.initialise(app);

  if (!global.isLambda) {
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
  app.use(buildOpenAPIValidator(__dirname));
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
  router.addRouteWithOptions("post", "/api/tokens", { tokenTypes: [ "access_token"] }, generateServiceToken);
  router.addRouteWithOptions("get", "/api/tokens", { tokenTypes: [ "access_token"] }, listServiceTokenIds);
  router.addRouteWithOptions("delete", "/api/tokens/:tokenId", { tokenTypes: [ "access_token"] }, revokeServiceToken);

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

  // analysis
  router.addRoute("post", "/api/analysis/bug-culprit-files", findBugCulprits);

  // query
  router.addRoute("post", "/api/query", executeQuery);

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
};

export const bootstrap = async () => {
  await validateLicense();
  await initServices();
  if (configReloadFlag) setInterval(initServices, CONFIG_REFRESH_MS);
};

export const startApi = async (): Promise<Express> => {
  const app = await initApi();
  if (global.isLambda) {
    logger(`CodeMetrics API ready`);
  } else {
    const listenPort = getConfigItemAsNumber("PORT", 3000);
    const listenHost =
      global.invocationMode === InvocationMode.DesktopMode
        ? "localhost"
        : getConfigItem("ADDR", "0.0.0.0");

    app.listen(listenPort, listenHost, () => {
      logger(`CodeMetrics API listening on ${listenHost}:${listenPort}`);
    });
  }
  return app;
};
