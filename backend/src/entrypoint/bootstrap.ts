import { logger } from "../utils/logger/logger";
import { ensureConfigLoaded, hasWorkloads, loadConfig, onConfigChange } from "../config/config";
import { initAdoPipelines } from "../services/pipelines/azure";
import { initGithubPipelines } from "../services/pipelines/github";
import { initJenkinsPipelines } from "../services/pipelines/jenkins";
import { initAdoVcs } from "../services/codeManagement/azure";
import { initGithubVcs } from "../services/codeManagement/github";
import { initAdoIssues } from "../services/projectManangement/azure";
import { initJiraIssues } from "../services/projectManangement/jira";
import { initGithubIssues } from "../services/projectManangement/github";
import { initBitbucketCloudVcs } from "../services/codeManagement/bitbucket-cloud";
import { initBitbucketServerVcs } from "../services/codeManagement/bitbucket-server";
import { initVcs } from "../services/codeManagement/vcsService";
import { initDatastore } from "../db/factory";
import { initSonar } from "../services/codeAnalysis/sonar";
import { initNoOpCodeAnalysis } from "../services/codeAnalysis/noop";
import { initCodePipelinePipelines } from "../services/pipelines/codepipeline";
import { initDynatracePipelines } from "../services/pipelines/dynatrace";
import { initAdoIncidents } from "../services/incidentManagement/azure";
import { initJiraIncidents } from "../services/incidentManagement/jira";
import { initServiceNowIncidents } from "../services/incidentManagement/servicenow";
import { initNoOpPipelines } from "../services/pipelines/noop";
import { initNoOpIncidents } from "../services/incidentManagement/noop";
import { initNoOpIssues } from "../services/projectManangement/noop";
import { initGithubIncidents } from "../services/incidentManagement/github";
import { getConfigItem } from "../config/sources/source";
import { initGithubDependencyAlerts } from "../services/dependencyAlerts/github";
import { initNoopDependencyAlerts } from "../services/dependencyAlerts/noop";
import { initClaudeLlm } from "../services/llm/claude";
import { initGeminiLlm } from "../services/llm/gemini";
import { validateLicense } from "../license/validate";

const LAZY_LOAD_CONFIG_DISABLED = getConfigItem("LAZY_LOAD_CONFIG_DISABLED") === "true";

let servicesInitialised = false;

/**
 * Initialise all services when workloads are available.
 * Can be called multiple times - will only initialise once.
 */
const initialiseServices = async (): Promise<void> => {
  if (servicesInitialised) {
    logger("Services already initialised, skipping");
    return;
  }

  if (!hasWorkloads()) {
    logger("No workloads configured - skipping service initialisation");
    return;
  }

  logger("Initialising services for workloads...");
  await initVcsProviders();
  initProjectMgmtProviders();
  initPipelineProviders();
  initCodeAnalysisProviders();
  initIncidentMgmtProviders();
  initDependencyAlertsProviders();
  initLlmProviders();
  servicesInitialised = true;
  logger("Services initialised successfully");
};

/**
 * Wrapper to load configuration files and initialise services.
 */
const initServices = async (): Promise<void> => {
  await initDatastore();

  if (LAZY_LOAD_CONFIG_DISABLED) {
    // Eager loading: load config now
    await loadConfig();
    await initialiseServices();
  } else {
    // Lazy loading: just attempt to load, services init via callback
    await ensureConfigLoaded();
  }
};

const initVcsProviders = async () => {
  initAdoVcs();
  initGithubVcs();
  initBitbucketCloudVcs();
  initBitbucketServerVcs();
  await initVcs();
};

const initProjectMgmtProviders = () => {
  initAdoIssues();
  initJiraIssues();
  initGithubIssues();
  initNoOpIssues();
};

const initPipelineProviders = () => {
  initAdoPipelines();
  initCodePipelinePipelines();
  initDynatracePipelines();
  initGithubPipelines();
  initJenkinsPipelines();
  initNoOpPipelines();
};

const initCodeAnalysisProviders = () => {
  initNoOpCodeAnalysis();
  initSonar();
};

const initIncidentMgmtProviders = () => {
  initAdoIncidents();
  initGithubIncidents();
  initJiraIncidents();
  initNoOpIncidents();
  initServiceNowIncidents();
};

function initDependencyAlertsProviders() {
  initGithubDependencyAlerts();
  initNoopDependencyAlerts();
}

const initLlmProviders = () => {
  initClaudeLlm();
  initGeminiLlm();
};

export const bootstrap = async () => {
  // Register callback to initialise services when workloads appear
  onConfigChange(async () => {
    logger("Config changed, checking if services need initialisation...");
    await validateLicense();
    await initialiseServices();
  });

  await validateLicense();
  await initServices();
};
