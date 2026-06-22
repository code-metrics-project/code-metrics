import { verbose } from "./logger/logger";
import { getEnvConfigItemAsBoolean } from "../config/sources/source";

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

type FeatureKey = keyof typeof Features;

export type FeatureConfig = {
  [K in FeatureKey]: boolean;
};

let features: FeatureConfig | null = null;

export const resetFeatures = (): FeatureConfig | null => {
  features = null;
  return features;
};

export const listActiveFeatures = (): FeatureConfig => {
  if (!features) {
    const f: Partial<FeatureConfig> = {};
    Object.keys(Features).forEach((key) => {
      const env = Features[key];
      f[key] = checkFeature(env);
    });
    features = f as FeatureConfig;
    verbose(`Features:`, features);
  }
  return features;
};

/**
 * Determines if the feature with the given name is enabled.
 * @param featureName
 */
const checkFeature = (featureName: string): boolean => getEnvConfigItemAsBoolean(featureName);

/**
 * Executes the `block` if the specified feature is active.
 * @param feature
 * @param block
 */
export const doIfFeatureActive = (feature: Features, block: () => void) => {
  const featureName = lookupName(feature);
  if (featureName && listActiveFeatures()[featureName]) {
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
