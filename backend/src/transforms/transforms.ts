import { Args, TransformTypes } from "../model/query";
import { toRollingAverage } from "./impl/rollingAverages";
import { IntermediaryDatedMetrics } from "../model/metrics";

const transformTypes = new Map<TransformTypes, Transformer>();

export type Transformer = {
  transform: TransformTypes;
  apply: (
    dataset: Map<string, IntermediaryDatedMetrics>,
    transformArgs: Args,
  ) => Promise<Map<string, IntermediaryDatedMetrics>>;
};

const registerTransform = (transform: Transformer) => transformTypes.set(transform.transform, transform);

export const getTransformByType = (transformType: TransformTypes) => transformTypes.get(transformType);

export const registerTransforms = () =>
  registerTransform({
    transform: TransformTypes.RollingAverages,
    apply: async (dataset, args) => {
      return toRollingAverage(dataset, {
        removeOutliers: args.removeOutliers,
        spansInDays: args.days,
        model: args.model,
      });
    },
  });
