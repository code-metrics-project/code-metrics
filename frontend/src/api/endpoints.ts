/**
 * API endpoint definitions.
 * All backend API routes are defined here.
 */

// Authentication
export const AUTH = "/api/authenticate";
export const CHECK_AUTH_STATE = "/api/authenticated";
export const REFRESH = "/api/refresh";
export const LOGOUT = "/api/logout";

// System
export const SYSTEM_BOOTSTRAP = "/api/system/bootstrap";
export const SYSTEM_CONFIG = "/api/system/config";

// Analysis
export const CODE_HOTSPOTS = "/api/analysis/code-hotspots";
export const TEMPORAL_COUPLING = "/api/analysis/temporal-coupling";
export const CODE_ANALYSIS_AGGREGATE = "/api/codebase/aggregate";
export const CODE_ANALYSIS_METRIC_HISTORY_CSV = "/api/codebase/metrics.csv";
export const METRIC_BREAKDOWN = "/api/codebase/breakdown";

// Workloads
export const WORKLOAD_ISSUE_TYPES = (workloadId: string) => `/api/workloads/${workloadId}/issue-types`;

// Quality
export const QUALITY_GATES = "/api/quality-gates";

// VCS
export const REPO_CHANGES = "/api/vcs/changes";
export const REPO_CHANGES_SUMMARY = "/api/vcs/changes/summary";

// Queries
export const QUERY = "/api/query";
export const SAVED_QUERY_COLLECTIONS = "/api/queries";
export const STORED_QUERY = (collection: string) => `/api/queries/${collection}`;

// Dashboards
export const DASHBOARDS = "/api/dashboards";
export const DASHBOARD = (id: string) => `/api/dashboards/${id}`;

// Pipeline
export const PIPELINE_RUNS = "/api/pipeline/runs";
export const PIPELINE_RUN = "/api/pipeline/run";
export const PIPELINE_DEPLOYMENTS = "/api/pipeline/deployments";
export const PIPELINE_RUN_REDIRECT = "/api/pipeline/redirect";

// Security
export const VULNERABILITIES = "/api/security/vulnerabilities";

// Tokens
export const SERVICE_TOKENS = "/api/tokens";
export const SERVICE_TOKEN = (tokenId: string) => `/api/tokens/${tokenId}`;

// Admin Datastores
export const ADMIN_DATASTORES = "/api/datastores";
export const ADMIN_DATASTORE_EXISTS = "/api/datastores/exists";
export const ADMIN_DATASTORE_COUNT = "/api/datastores/count";
export const ADMIN_DATASTORE_EMPTY = "/api/datastores/empty";
