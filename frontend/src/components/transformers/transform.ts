import { type FC } from "react";
import { isFeatureActive, Features } from "@/config/features";
import { MLForecast } from "./MLForecast";
import { RollingAverages } from "./RollingAverages";

export enum TransformerId {
  MLForecast = "ml-forecast",
  RollingAverages = "rolling-averages",
}

export type TransformerArgs = Record<string, unknown>;

export interface Transformer {
  component: FC<TransformerComponentProps>;
  disabled?: boolean;
  id: TransformerId;
  subtitle?: string;
  title: string;
}

export interface TransformerComponentProps {
  value?: TransformerArgs;
  onChange?: (value: TransformerArgs) => void;
  disabled?: boolean;
}

export interface ConfiguredTransformer {
  id: string;
  transform: TransformerId | null;
  args: TransformerArgs;
}

export enum QueryName {
  BugsNew = "bugs-new",
  BugsOpen = "bugs-open",
  ChangeFailureRate = "change-failure-rate",
  CodeCoverage = "code-coverage",
  CyclomaticComplexity = "cyclomatic-complexity",
  DeploymentFrequency = "deployment-frequency",
  LeadTimeForChanges = "lead-time-for-changes",
  LinesOfCode = "lines-of-code",
  NonWorkingPattern = "non-working-pattern",
  PipelineRuns = "pipeline-runs",
  PipelineDurations = "pipeline-durations",
  ProductionIncidents = "production-incidents",
  PROpenTime = "pr-open-time",
  PRSize = "pr-size",
  PRsPerIssue = "prs-per-issue",
  IssuesPerPR = "issues-per-pr",
  RepoChurn = "repo-churn",
  TimeToRestoreService = "time-to-restore-service",
}

export type TransformerMap = Map<QueryName, Transformer[]>;

const getMLForecastTransformers = (): Transformer[] => {
  if (isFeatureActive(Features.mlForecasts)) {
    return [
      {
        component: MLForecast,
        id: TransformerId.MLForecast,
        title: "Machine learning forecast",
      },
    ];
  }
  return [];
};

const rollingAveragesTransformer: Transformer = {
  component: RollingAverages,
  id: TransformerId.RollingAverages,
  title: "Rolling averages",
};

export const getTransformerMap = (): TransformerMap => {
  const mlForecast = getMLForecastTransformers();

  return new Map([
    [QueryName.BugsNew, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.BugsOpen, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.ChangeFailureRate, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.CodeCoverage, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.CyclomaticComplexity, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.DeploymentFrequency, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.LeadTimeForChanges, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.LinesOfCode, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.NonWorkingPattern, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.PipelineRuns, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.PipelineDurations, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.ProductionIncidents, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.PROpenTime, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.PRSize, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.PRsPerIssue, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.IssuesPerPR, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.RepoChurn, [...mlForecast, rollingAveragesTransformer]],
    [QueryName.TimeToRestoreService, [...mlForecast, rollingAveragesTransformer]],
  ]);
};

export const getTransformersForQueries = (queryTypes: string[]): TransformerMap => {
  const fullMap = getTransformerMap();
  return new Map([...fullMap].filter(([queryName]) => queryTypes.includes(queryName)));
};
