import { type Component } from "vue";
import { QueryName } from "@/queries/queries";
import RollingAverages from "./RollingAverages/RollingAverages.vue";

enum TransformerId {
  RollingAverages = "rolling-averages",
}

type Transformer = {
  component: Component;
  id: TransformerId;
};

const rollingAveragesTransformer = {
  component: RollingAverages,
  id: TransformerId.RollingAverages,
};

export type TransformerMap = Map<QueryName, Transformer[]>;

export const DEFAULT_QUERY_TRANSFORMER_MAP: TransformerMap = new Map([
  [QueryName.BugsNew, [rollingAveragesTransformer]],
  [QueryName.BugsOpen, [rollingAveragesTransformer]],
  [QueryName.ChangeFailureRate, [rollingAveragesTransformer]],
  [QueryName.CodeCoverage, [rollingAveragesTransformer]],
  [QueryName.CyclomaticComplexity, [rollingAveragesTransformer]],
  [QueryName.DeploymentFrequency, [rollingAveragesTransformer]],
  [QueryName.LeadTimeForChanges, [rollingAveragesTransformer]],
  [QueryName.LinesOfCode, [rollingAveragesTransformer]],
  [QueryName.NonWorkingPattern, [rollingAveragesTransformer]],
  [QueryName.PipelineRuns, [rollingAveragesTransformer]],
  [QueryName.PipelineDurations, [rollingAveragesTransformer]],
  [QueryName.ProductionIncidents, [rollingAveragesTransformer]],
  [QueryName.PROpenTime, [rollingAveragesTransformer]],
  [QueryName.PRSize, [rollingAveragesTransformer]],
  [QueryName.RepoChurn, [rollingAveragesTransformer]],
  [QueryName.TimeToRestoreService, [rollingAveragesTransformer]],
]);
