import { verbose } from "@/utils/logger";
import { getBootstrap } from "@/config/config";

/**
 * Maps features to environment variable names.
 */
export enum Features {
  dora = "FEATURE_DORA_METRICS",
  languageSelector = "FEATURE_LANGUAGE_SELECTOR",
  mlForecasts = "FEATURE_ML_FORECASTS",
  predictions = "FEATURE_PREDICTIONS",
  temporalCoupling = "FEATURE_TEMPORAL_COUPLING",
}

export type FeatureKey = keyof typeof Features;

export type FeatureConfig = Record<FeatureKey, boolean>;

let features: FeatureConfig | null = null;

export const listActiveFeatures = (): FeatureConfig => {
  if (!features) {
    features = getBootstrap().features;
    verbose(`Features:`, features);
  }
  return features;
};

/**
 * Executes the `block` if the specified feature is active.
 * @param feature
 * @param block
 */
export const isFeatureActive = (feature: Features) => {
  const featureName = lookupName(feature);
  return featureName && listActiveFeatures()[featureName];
};

/**
 * Executes the `block` if the specified feature is active.
 * @param feature
 * @param block
 */
export const doIfFeatureActive = (feature: Features, block: () => void) => {
  if (isFeatureActive(feature)) {
    block();
  }
};

/**
 * Reverse lookup of feature to name.
 * @param feature
 */
const lookupName = (feature: Features): FeatureKey | undefined => {
  const entry = Object.entries(Features).find((f) => f[1] === feature);
  return entry ? (entry[0] as FeatureKey) : undefined;
};
