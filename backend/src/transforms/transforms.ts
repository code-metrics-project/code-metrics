import { Args, type RawQuery, TransformTypes } from "../model/query";
import { getMLForecast } from "./impl/mlForecast";
import { toRollingAverage } from "./impl/rollingAverages";
import { IntermediaryDatedMetrics } from "../model/metrics";

const transformTypes = new Map<TransformTypes, Transformer>();

export type Transformer = {
  transform: TransformTypes;
  apply: (
    query: RawQuery,
    dataset: Map<string, IntermediaryDatedMetrics>,
    transformArgs: Args,
  ) => Promise<Map<string, IntermediaryDatedMetrics>>;
};

const registerTransform = (transform: Transformer) => transformTypes.set(transform.transform, transform);

export const getTransformByType = (transformType: TransformTypes) => transformTypes.get(transformType);

export const registerTransforms = () => {
  registerTransform({
    transform: TransformTypes.MLForecast,
    apply: async (query, _dataset, args) => {
      return getMLForecast(query, args as Parameters<typeof getMLForecast>[1]);
    },
  });
  registerTransform({
    transform: TransformTypes.RollingAverages,
    apply: async (_query, dataset, args) => {
      return toRollingAverage(dataset, {
        removeOutliers: args.removeOutliers,
        spansInDays: args.days,
        model: args.model,
      });
    },
  });
};
