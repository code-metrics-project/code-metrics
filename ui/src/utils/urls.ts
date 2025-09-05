import axios from "axios";

export const AUTH = "/api/authenticate";
export const CHECK_AUTH_STATE = "/api/authenticated";
export const REFRESH = "/api/refresh";
export const LOGOUT = "/api/logout";
export const SYSTEM_BOOTSTRAP = "/api/system/bootstrap";
export const SYSTEM_CONFIG = "/api/system/config";
export const BUG_CULPRIT_FILES = "/api/analysis/bug-culprit-files";
export const QUALITY_GATES = "/api/quality-gates";
export const METRIC_BREAKDOWN = "/api/codebase/breakdown";
export const REPO_CHANGES = "/api/vcs/changes";
export const CODE_ANALYSIS_METRIC_HISTORY_CSV = "/api/codebase/metrics.csv";
export const QUERY = "/api/query";
export const CODE_ANALYSIS_AGGREGATE = "/api/codebase/aggregate";
export const SAVED_QUERY_COLLECTIONS = "/api/queries";
export const STORED_QUERY = (collection: string) => `/api/queries/${collection}`;
export const VULNERABILITIES = "/api/vulnerabilities";
export const DASHBOARDS = "/api/dashboards";
export const DASHBOARD = (id: string) => `/api/dashboards/${id}`;
export const PIPELINE_RUNS = "/api/pipeline/runs";
export const PIPELINE_RUN = "/api/pipeline/run";
export const PIPELINE_DEPLOYMENTS = "/api/pipeline/deployments";
export const PIPELINE_RUN_REDIRECT = "/api/pipeline/redirect";

let apiBaseUrl = "";

const setApiBaseUrl = (url: string) => {
  console.log(`Setting API base URL to '${url}'`);
  apiBaseUrl = url;
  axios.defaults.baseURL = url;
};

const getApiBaseUrl = (): string => apiBaseUrl;

export { getApiBaseUrl, setApiBaseUrl };
