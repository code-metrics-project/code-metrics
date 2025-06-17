import express, { Express } from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { liveness, readiness } from "./routes/health";
import { manageCache } from "./routes/system"
import { findBugCulprits } from "./routes/bugCulprits";
import { fetchBugHistory } from "./routes/tickets";
import { fileMetricBreakdown } from "./routes/codeAnalysisBreakdown";
import { codeAnalysisHistoryAsCsv, codeAnalysisHistoryAsJson } from "./routes/codeAnalysisHistory";
import { codeAnalysisAggregate } from "./routes/codeAnalysisAggregate";
import { vcsPROpenTime, vcsRepoChanges, vcsRepoChurn } from "./routes/vcs";
import { logger } from "./utils/logger/logger";
import { getPipelineDeployments, getPipelineRun, getPipelineRunRedirect, getPipelineRuns } from "./routes/pipelines";
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
import { logout } from "./routes/authenticate";
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

const CONFIG_REFRESH_MS = (process.env.CONFIG_REFRESH_MS as unknown as number) ?? 30000;
const configReloadFlag = process.env.CONFIG_AUTO_RELOAD === "true";

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
  router.addUnauthenticatedRoute("get", "/api/logout", logout);

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

  router.addRoute("get", "/api/dashboards", getDashboards);
  router.addRoute("get", "/api/dashboards/:id", getDashboard);

  doIfFeatureActive(Features.predictions, () => {
    router.addRoute("post", "/api/prediction/linear", predictLinear);
  });

  router.addRoute("post", "/api/vulnerabilities", persistVulnerabilities);
};

export const bootstrap = async () => {
  if (!(await validateLicense())) {
    process.exit(2);
  }
  await initServices();
  if (configReloadFlag) setInterval(initServices, CONFIG_REFRESH_MS);
};

export const startApi = async (): Promise<Express> => {
  const app = await initApi();
  if (global.isLambda) {
    logger(`CodeMetrics API ready`);
  } else {
    const listenPort = (process.env.PORT as unknown as number) ?? 3000;
    const listenHost = global.invocationMode === InvocationMode.DesktopMode
          ? 'localhost'
          : (process.env.ADDR as string | undefined) ?? '0.0.0.0';

    app.listen(listenPort, listenHost, () => {
      logger(`CodeMetrics API listening on ${listenHost}:${listenPort}`);
    });
  }
  return app;
};
