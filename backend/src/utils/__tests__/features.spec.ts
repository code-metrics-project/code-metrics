import { Features, listActiveFeatures, doIfFeatureActive, resetFeatures } from "../features";

const featureName = "FEATURE_PREDICTIONS";

describe("features", () => {
  beforeEach(() => {
    resetFeatures();
  });

  it("should list active features", () => {
    process.env[featureName] = "true";
    const activeFeatures = listActiveFeatures();
    expect(activeFeatures.predictions).toBe(true);
  });

  it("should execute block if feature is active", () => {
    process.env[featureName] = "true";
    const block = jest.fn();
    doIfFeatureActive(featureName as Features, block);
    expect(block).toHaveBeenCalledTimes(1);
  });

  it("should not execute block if feature is not active", () => {
    process.env[featureName] = "false";
    const block = jest.fn();
    doIfFeatureActive(featureName as Features, block);
    expect(block).not.toHaveBeenCalled();
  });
});
