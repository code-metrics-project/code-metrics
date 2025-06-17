export enum Paths {
  Home = "/",
  Login = "/login",
  LoginCallback = "/login/callback",
  Logout = "/logout",

  Program = "/program",
  ProgramMetrics = "/program/metrics",
  ProgramNarratives = "/program/changes",
  ProgramPipelineHealth = "/program/pipeline-health",
  ProgramSecurity = "/program/security",

  Workloads = "/workload",
  WorkloadChanges = "/workload/changes",
  WorkloadCodeQuality = "/workload/code-quality",
  WorkloadHealth = "/workload/:workloadId",
  WorkloadAnalysis = "/workload/analysis",
  WorkloadPipelineRuns = "/workload/pipeline-runs",
  WorkloadPipelineRun = "/workload/pipeline-run",
  WorkloadPipelineHealth = "/workload/pipeline-health",
  ProgramTickets = "/workload/tickets",
  DORA = "/workload/dora",

  Explore = "/explore",
  SavedDashboards = "/explore/dashboard/saved",
  NewQuery = "/explore/query/new",
  SavedQueries = "/explore/query",
  SavedQuery = "/explore/query/:collectionId",
}
