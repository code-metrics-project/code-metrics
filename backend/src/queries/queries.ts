import { ReduceStrategy, registerQuery } from "./config";
import {
  Branches,
  ChangeMeasureArgs,
  IncidentFilter,
  IssueFilter,
  JobGroups,
  PipelineQueryOptions,
  PipelineStageInput,
  RepoGroups,
  RollingAverages,
  SeverityOptionsInput,
  StartDate,
  Workloads,
} from "../model/queryInputs";
import { fetchIncidents, fetchNewBugs, fetchOpenBugs } from "./impl/issues";
import { fetchCodeAnalysis } from "./impl/code-analysis";
import { fetchRepoChurn } from "./impl/repo-churn";
import { fetchPipelineDurations, fetchPipelineRuns, fetchPipelineSuccess } from "./impl/pipelines";
import { fetchPROpenTime } from "./impl/pr-open-time";
import { fetchPRSize } from "./impl/pr-size";
import { fetchVulnerabilities } from "./impl/vulnerabilities";
import {
  fetchChangeFailureRate,
  fetchDeploymentFrequency,
  fetchLeadTimeForChanges,
  fetchTimeToRestoreService,
} from "./impl/dora";
import { fetchNonWorkingPatternChanges } from "./impl/working-pattern";
import { fetchChangeCategories } from "./impl/change-type";

export enum QueryName {
  CodeCoverage = "code-coverage",
  CyclomaticComplexity = "cyclomatic-complexity",
  BugsNew = "bugs-new",
  BugsOpen = "bugs-open",
  ChangeCategories = "change-categories",
  ChangeFailureRate = "change-failure-rate",
  DeploymentFrequency = "deployment-frequency",
  LeadTimeForChanges = "lead-time-for-changes",
  LinesOfCode = "lines-of-code",
  NonWorkingPattern = "non-working-pattern",
  PipelineRuns = "pipeline-runs",
  PipelineSuccess = "pipeline-success",
  PipelineDurations = "pipeline-durations",
  ProductionIncidents = "production-incidents",
  RepoChurn = "repo-churn",
  PROpenTime = "pr-open-time",
  PRSize = "pr-size",
  TimeToRestoreService = "time-to-restore-service",
  Vulnerabilities = "vulnerabilities",
}

type BugsArgs = Workloads & StartDate & IssueFilter & RollingAverages;

type CodeMetricHistoryArgs = Workloads & RepoGroups & StartDate & RollingAverages;

export type ChangeFailureRateArgs = Workloads & StartDate & IncidentFilter & RollingAverages;

export type ChangeTypeArgs = Workloads & RepoGroups & StartDate & RollingAverages;

export type DeploymentFrequencyArgs = Workloads & JobGroups & StartDate & PipelineStageInput & RollingAverages;

export type LeadTimeForChangesArgs = Workloads & JobGroups & StartDate & RollingAverages;

export type NonWorkingPatternArgs = Workloads & RepoGroups & StartDate & SeverityOptionsInput & RollingAverages;

export type PipelineRunArgs = Workloads &
  JobGroups &
  Branches &
  StartDate &
  RollingAverages &
  PipelineQueryOptions &
  PipelineStageInput;

export type PipelineSuccessArgs = Workloads &
  JobGroups &
  Branches &
  StartDate &
  RollingAverages &
  PipelineQueryOptions &
  PipelineStageInput;

export type PipelineDurationArgs = Workloads &
  JobGroups &
  Branches &
  StartDate &
  RollingAverages &
  PipelineQueryOptions &
  PipelineStageInput;

type ProductionIncidentsArgs = Workloads & StartDate & IncidentFilter;

export type PROpenTimeArgs = Workloads & StartDate & RollingAverages & RepoGroups;

type RepoChurnArgs = Workloads & RepoGroups & StartDate & RollingAverages & ChangeMeasureArgs;

export type TimeToRestoreServiceArgs = Workloads & StartDate & IncidentFilter & RollingAverages;

type VulnerabilitiesArgs = Workloads & StartDate & RollingAverages & RepoGroups;

export const registerQueries = () => {
  registerQuery({
    name: QueryName.BugsNew,
    axisNames: ["escaped-bugs", "all-bugs"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: BugsArgs) => await fetchNewBugs(args.workloads, args.startDate, args.issueFilter?.priority),
  });

  registerQuery({
    name: QueryName.BugsOpen,
    axisNames: ["open-bugs"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: BugsArgs) => await fetchOpenBugs(args.workloads, args.startDate, args.issueFilter?.priority),
  });

  registerQuery({
    name: QueryName.ChangeFailureRate,
    axisNames: ["change-failure-rate"],
    reduce: ReduceStrategy.AVERAGE,
    execute: async (args: ChangeFailureRateArgs) => await fetchChangeFailureRate(args),
  });

  registerQuery({
    name: QueryName.ChangeCategories,
    axisNames: ["change-category-ticketed", "change-category-pr", "change-category-commit"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: ChangeTypeArgs) => await fetchChangeCategories(args),
  });

  registerQuery({
    name: QueryName.CodeCoverage,
    axisNames: ["coverage"],
    reduce: ReduceStrategy.AVERAGE,
    execute: async (args: CodeMetricHistoryArgs) =>
      await fetchCodeAnalysis(args.workloads, args.repoGroups, "coverage", args.startDate),
  });

  registerQuery({
    name: QueryName.CyclomaticComplexity,
    axisNames: ["complexity"],
    reduce: ReduceStrategy.AVERAGE,
    execute: async (args: CodeMetricHistoryArgs) =>
      await fetchCodeAnalysis(args.workloads, args.repoGroups, "complexity", args.startDate),
  });

  registerQuery({
    name: QueryName.DeploymentFrequency,
    axisNames: ["deployment-frequency"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: DeploymentFrequencyArgs) => await fetchDeploymentFrequency(args),
  });

  registerQuery({
    name: QueryName.LeadTimeForChanges,
    axisNames: ["lead-time"],
    reduce: ReduceStrategy.AVERAGE,
    execute: async (args: LeadTimeForChangesArgs) => await fetchLeadTimeForChanges(args),
  });

  registerQuery({
    name: QueryName.LinesOfCode,
    axisNames: ["ncloc"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: CodeMetricHistoryArgs) =>
      await fetchCodeAnalysis(args.workloads, args.repoGroups, "ncloc", args.startDate),
  });

  registerQuery({
    name: QueryName.NonWorkingPattern,
    axisNames: ["non-working", "non-working-high", "non-working-medium", "non-working-low"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: NonWorkingPatternArgs) => await fetchNonWorkingPatternChanges(args),
  });

  registerQuery({
    name: QueryName.PipelineRuns,
    axisNames: ["runs-aborted", "runs-failed", "runs-successful"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: PipelineRunArgs) => await fetchPipelineRuns(args),
  });

  registerQuery({
    name: QueryName.PipelineSuccess,
    axisNames: ["run-success"],
    reduce: ReduceStrategy.AVERAGE,
    execute: async (args: PipelineSuccessArgs) => await fetchPipelineSuccess(args),
  });

  registerQuery({
    name: QueryName.PipelineDurations,
    axisNames: ["run-duration"],
    reduce: ReduceStrategy.AVERAGE,
    execute: async (args: PipelineDurationArgs) => await fetchPipelineDurations(args),
  });

  registerQuery({
    name: QueryName.ProductionIncidents,
    axisNames: ["incidents"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: ProductionIncidentsArgs) =>
      await fetchIncidents({
        workloads: args.workloads,
        startDate: args.startDate,
        priority: args.incidentFilter?.priority,
      }),
  });

  registerQuery({
    name: QueryName.PROpenTime,
    axisNames: ["pr-open-time"],
    reduce: ReduceStrategy.AVERAGE,
    execute: async (args: PROpenTimeArgs) => await fetchPROpenTime(args.workloads, args.startDate, args.repoGroups),
  });

  registerQuery({
    name: QueryName.PRSize,
    axisNames: ["pr-size"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: PROpenTimeArgs) => await fetchPRSize(args.workloads, args.startDate, args.repoGroups),
  });

  registerQuery({
    name: QueryName.RepoChurn,
    axisNames: ["repo-churn"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: RepoChurnArgs) =>
      await fetchRepoChurn(args.workloads, args.startDate, args.changeMeasure, args.repoGroups),
  });

  registerQuery({
    name: QueryName.TimeToRestoreService,
    axisNames: ["time-to-restore"],
    reduce: ReduceStrategy.AVERAGE,
    execute: async (args: TimeToRestoreServiceArgs) => await fetchTimeToRestoreService(args),
  });

  registerQuery({
    name: QueryName.Vulnerabilities,
    axisNames: ["vulns-critical", "vulns-high", "vulns-medium", "vulns-low", "vulns-unknown"],
    reduce: ReduceStrategy.SUM,
    execute: async (args: VulnerabilitiesArgs) =>
      await fetchVulnerabilities(args.workloads, args.startDate, args.repoGroups),
  });
};
