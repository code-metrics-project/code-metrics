import { getApiBaseUrl, setApiBaseUrl } from "@/utils/apiClient";

export const AUTH = "/api/authenticate";
export const CHECK_AUTH_STATE = "/api/authenticated";
export const REFRESH = "/api/refresh";
export const LOGOUT = "/api/logout";
export const SYSTEM_BOOTSTRAP = "/api/system/bootstrap";
export const SYSTEM_CONFIG = "/api/system/config";
export const CODE_HOTSPOTS = "/api/analysis/code-hotspots";
export const WORKLOAD_ISSUE_TYPES = (workloadId: string) => `/api/workloads/${workloadId}/issue-types`;
export const QUALITY_GATES = "/api/quality-gates";
export const METRIC_BREAKDOWN = "/api/codebase/breakdown";
export const REPO_CHANGES = "/api/vcs/changes";
export const REPO_CHANGES_SUMMARY = "/api/vcs/changes/summary";
export const CODE_ANALYSIS_METRIC_HISTORY_CSV = "/api/codebase/metrics.csv";
export const QUERY = "/api/query";
export const CODE_ANALYSIS_AGGREGATE = "/api/codebase/aggregate";
export const SAVED_QUERY_COLLECTIONS = "/api/queries";
export const STORED_QUERY = (collection: string) => `/api/queries/${collection}`;
export const VULNERABILITIES = "/api/security/vulnerabilities";
export const DASHBOARDS = "/api/dashboards";
export const DASHBOARD = (id: string) => `/api/dashboards/${id}`;
export const PIPELINE_RUNS = "/api/pipeline/runs";
export const PIPELINE_RUN = "/api/pipeline/run";
export const PIPELINE_DEPLOYMENTS = "/api/pipeline/deployments";
export const PIPELINE_RUN_REDIRECT = "/api/pipeline/redirect";
export const ADMIN_REMOTE_CONNECTIONS = "/api/admin/remote-connections";

export { getApiBaseUrl, setApiBaseUrl };
