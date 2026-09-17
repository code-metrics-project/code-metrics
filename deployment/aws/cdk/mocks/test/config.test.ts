import { applyEnvironmentOverride, getEnvironment, getStackPrefix } from "../lib/config";

describe("mocks CDK config helpers", () => {
  it("reads and normalises the environment slug", () => {
    expect(getEnvironment({ global: { environment: "prod" } })).toBe("prod");
    expect(getEnvironment({ global: { environment: "  Dev " } })).toBe("dev");
    expect(getEnvironment({ global: { environment: "Demo-EU" } })).toBe("demo-eu");
  });

  it("rejects a missing or empty environment", () => {
    expect(() => getEnvironment({ global: { name: "CodeMetrics" } })).toThrow(/Missing environment/);
    expect(() => getEnvironment({ global: { environment: "" } })).toThrow(/Missing environment/);
    expect(() => getEnvironment({ global: { environment: "   " } })).toThrow(/Missing environment/);
    expect(() => getEnvironment({})).toThrow(/Missing environment/);
  });

  it("rejects invalid environment slugs", () => {
    for (const invalid of ["-dev", "dev-", "dev..staging", "with_space", "123-"]) {
      expect(() => getEnvironment({ global: { environment: invalid } })).toThrow(/Invalid environment/);
    }
  });

  it("derives the stack prefix from name and environment", () => {
    expect(getStackPrefix({ global: { name: "CodeMetricsMock", environment: "dev" } })).toBe(
      "CodeMetricsMock-dev",
    );
    expect(
      getStackPrefix({ global: { name: "CodeMetricsMock", environment: "Prod" } }),
    ).toBe("CodeMetricsMock-prod");
  });

  it("rejects a missing global name when deriving the stack prefix", () => {
    expect(() => getStackPrefix({ global: { environment: "dev" } })).toThrow(/global\.name/);
  });

  it("applies the environment override onto the config", () => {
    const originalEnv = process.env.CODEMETRICS_ENV;
    delete process.env.CODEMETRICS_ENV;

    try {
      const config: any = { global: { name: "CodeMetricsMock" } };

      applyEnvironmentOverride(config, "dev");
      expect(config.global.environment).toBe("dev");
      expect(getStackPrefix(config)).toBe("CodeMetricsMock-dev");

      const nameless: any = {};
      applyEnvironmentOverride(nameless, "prod");
      expect(nameless.global.environment).toBe("prod");

      const untouched: any = { global: { name: "CodeMetricsMock" } };
      applyEnvironmentOverride(untouched, undefined);
      expect(untouched.global.environment).toBeUndefined();
      applyEnvironmentOverride(untouched, "   ");
      expect(untouched.global.environment).toBeUndefined();

      process.env.CODEMETRICS_ENV = "staging";
      const fromEnv: any = { global: { name: "CodeMetricsMock", environment: "prod" } };
      applyEnvironmentOverride(fromEnv, undefined);
      expect(fromEnv.global.environment).toBe("staging");
    } finally {
      if (originalEnv === undefined) {
        delete process.env.CODEMETRICS_ENV;
      } else {
        process.env.CODEMETRICS_ENV = originalEnv;
      }
    }
  });
});
