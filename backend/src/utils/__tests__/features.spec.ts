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

  describe("asyncQuery feature", () => {
    afterEach(() => {
      delete process.env.FEATURE_ASYNC_QUERY;
    });

    it("should be disabled by default", () => {
      const activeFeatures = listActiveFeatures();
      expect(activeFeatures.asyncQuery).toBe(false);
    });

    it("should be enabled when FEATURE_ASYNC_QUERY is set to true", () => {
      process.env.FEATURE_ASYNC_QUERY = "true";
      const activeFeatures = listActiveFeatures();
      expect(activeFeatures.asyncQuery).toBe(true);
    });

    it("should be disabled when FEATURE_ASYNC_QUERY is set to false", () => {
      process.env.FEATURE_ASYNC_QUERY = "false";
      const activeFeatures = listActiveFeatures();
      expect(activeFeatures.asyncQuery).toBe(false);
    });
  });
});
