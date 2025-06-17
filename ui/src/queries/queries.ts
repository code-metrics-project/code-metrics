import {registerQuery} from "@/queries/config";
import {InputType} from "@/queries/inputs";
import {summariseNumeric} from "@/queries/summary";
import {doIfFeatureActive, Features} from "@/utils/features";
import {formatSecondsAsDaysAndHours, formatSecondsAsHoursAndMinutes, formatValueAsPercentage,} from "@/chart/common";

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
  PipelineDurations = "pipeline-durations",
  ProductionIncidents = "production-incidents",
  RepoChurn = "repo-churn",
  PROpenTime = "pr-open-time",
  TimeToRestoreService = "time-to-restore-service",
  PRSize = "pr-size",
  Vulnerabilities = "vulnerabilities",
}

export function registerQueries() {
  registerQuery({
    name: QueryName.BugsNew,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.START_DATE,
      InputType.ISSUE_FILTER,
    ],
    chart: {
      axes: [{ axisName: "escaped-bugs" }, { axisName: "all-bugs" }],
    },
    summariser: (results) => summariseNumeric(results, "New bugs", "mdi-bug"),
  });

  registerQuery({
    name: QueryName.BugsOpen,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.START_DATE,
      InputType.ISSUE_FILTER,
    ],
    chart: {
      axes: [{ axisName: "open-bugs" }],
    },
    summariser: (results) => summariseNumeric(results, "Open bugs", "mdi-bug"),
  });

  doIfFeatureActive(Features.dora, () => {
    registerQuery({
      name: QueryName.ChangeFailureRate,
      requires: [
        InputType.TAGS,
        InputType.WORKLOAD_NAMES,
        InputType.START_DATE,
        InputType.INCIDENT_FILTER,
      ],
      chart: {
        axes: [{ axisName: "change-failure-rate" }],
        valueFormatter: formatValueAsPercentage,
        yAxisMax: 1,
      },
    });
  });

  registerQuery({
    name: QueryName.ChangeCategories,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
    ],
    chart: {
      axes: [
        { axisName: "change-category-ticketed" },
        { axisName: "change-category-pr" },
        { axisName: "change-category-commit" },
      ],
    },
  });

  registerQuery({
    name: QueryName.CodeCoverage,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
    ],
    chart: {
      axes: [{ axisName: "coverage" }],
    },
  });

  registerQuery({
    name: QueryName.CyclomaticComplexity,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
    ],
    chart: {
      axes: [{ axisName: "complexity" }],
    },
  });

  doIfFeatureActive(Features.dora, () => {
    registerQuery({
      name: QueryName.DeploymentFrequency,
      requires: [
        InputType.TAGS,
        InputType.WORKLOAD_NAMES,
        InputType.JOB_GROUPS,
        InputType.START_DATE,
        InputType.PIPELINE_STAGE,
      ],
      chart: {
        axes: [{ axisName: "deployment-frequency" }],
      },
    });
  });

  doIfFeatureActive(Features.dora, () => {
    registerQuery({
      name: QueryName.LeadTimeForChanges,
      requires: [
        InputType.TAGS,
        InputType.WORKLOAD_NAMES,
        InputType.JOB_GROUPS,
        InputType.START_DATE,
      ],
      chart: {
        axes: [{ axisName: "lead-time" }],
        valueFormatter: formatSecondsAsDaysAndHours,
      },
    });
  });

  registerQuery({
    name: QueryName.LinesOfCode,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
    ],
    chart: {
      axes: [{ axisName: "ncloc" }],
    },
  });

  registerQuery({
    name: QueryName.NonWorkingPattern,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
      InputType.SEVERITY_OPTIONS,
    ],
    chart: {
      axes: [
        { axisName: "non-working" },
        { axisName: "non-working-high", variant: "danger" },
        { axisName: "non-working-medium", variant: "warning" },
        { axisName: "non-working-low", variant: "neutral" },
      ],
    },
  });

  registerQuery({
    name: QueryName.PipelineRuns,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.JOB_GROUPS,
      InputType.BRANCH_NAMES,
      InputType.START_DATE,
      InputType.PIPELINE_OPTIONS,
      InputType.PIPELINE_ACTOR_TYPE,
      InputType.PIPELINE_STAGE,
    ],
    chart: {
      axes: [
        { axisName: "pipeline-runs" },
        { axisName: "runs-aborted", variant: "warning" },
        { axisName: "runs-failed", variant: "danger" },
        { axisName: "runs-successful", variant: "success" },
      ],
    },
  });

  registerQuery({
    name: QueryName.PipelineDurations,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.JOB_GROUPS,
      InputType.BRANCH_NAMES,
      InputType.START_DATE,
      InputType.PIPELINE_STAGE,
    ],
    chart: {
      axes: [{ axisName: "run-duration" }],
      valueFormatter: formatSecondsAsHoursAndMinutes,
    },
  });

  registerQuery({
    name: QueryName.ProductionIncidents,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.START_DATE,
      InputType.INCIDENT_FILTER,
    ],
    chart: {
      axes: [{ axisName: "incidents" }],
    },
    summariser: (results) =>
      summariseNumeric(results, "Production incidents", "mdi-alert-octagram"),
  });

  registerQuery({
    name: QueryName.PROpenTime,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
    ],
    chart: {
      axes: [{ axisName: "pr-open-time" }],
      valueFormatter: formatSecondsAsDaysAndHours,
    },
  });

  registerQuery({
    name: QueryName.PRSize,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
    ],
    chart: {
      axes: [{ axisName: "pr-size" }],
    },
  });

  registerQuery({
    name: QueryName.RepoChurn,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
    ],
    chart: {
      axes: [{ axisName: "repo-churn" }],
    },
  });

  doIfFeatureActive(Features.dora, () => {
    registerQuery({
      name: QueryName.TimeToRestoreService,
      requires: [
        InputType.TAGS,
        InputType.WORKLOAD_NAMES,
        InputType.START_DATE,
        InputType.INCIDENT_FILTER,
      ],
      chart: {
        axes: [{ axisName: "time-to-restore" }],
        valueFormatter: formatSecondsAsHoursAndMinutes,
      },
    });
  });

  registerQuery({
    name: QueryName.Vulnerabilities,
    requires: [
      InputType.TAGS,
      InputType.WORKLOAD_NAMES,
      InputType.REPO_GROUPS,
      InputType.START_DATE,
    ],
    chart: {
      axes: [
        { axisName: "vulns-critical", variant: "danger" },
        { axisName: "vulns-high", variant: "danger" },
        { axisName: "vulns-medium", variant: "warning" },
        { axisName: "vulns-low", variant: "neutral" },
        { axisName: "vulns-unknown" },
      ],
    },
  });
}
