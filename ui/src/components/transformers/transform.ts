import { type Component } from "vue";
import { QueryName } from "@/queries/queries";
import MLForecast from "./MLForecast/MLForecast.vue";
import RollingAverages from "./RollingAverages/RollingAverages.vue";
import { Features, isFeatureActive } from "@/utils/features";

enum TransformerId {
  MLForecast = "ml-forecast",
  RollingAverages = "rolling-averages",
}

type Transformer = {
  component: Component;
  disabled?: boolean;
  id: TransformerId;
  subtitle?: string;
  title: string;
};

const mlForecastTransformer = (): Transformer[] => {
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

const rollingAveragesTransformer = {
  component: RollingAverages,
  id: TransformerId.RollingAverages,
  title: "Rolling averages",
};

export type TransformerMap = Map<QueryName, Transformer[]>;

export const DEFAULT_QUERY_TRANSFORMER_MAP: TransformerMap = new Map([
  [QueryName.BugsNew, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.BugsOpen, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.ChangeFailureRate, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.CodeCoverage, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.CyclomaticComplexity, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.DeploymentFrequency, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.LeadTimeForChanges, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.LinesOfCode, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.NonWorkingPattern, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.PipelineRuns, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.PipelineDurations, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.ProductionIncidents, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.PROpenTime, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.PRSize, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.RepoChurn, [...mlForecastTransformer(), rollingAveragesTransformer]],
  [QueryName.TimeToRestoreService, [...mlForecastTransformer(), rollingAveragesTransformer]],
]);
