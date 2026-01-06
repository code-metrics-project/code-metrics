import type { JestConfigWithTsJest } from "ts-jest";

const enableCoverage = process.env.COVERAGE_ENABLED === "true";

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  runner: "groups",
  setupFilesAfterEnv: ["./src/tests/setup.js"],
  testMatch: ["**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)"],
  testEnvironment: "node",
  collectCoverage: enableCoverage,
  coverageReporters: ["json", "html", "lcov", "text"],
};

export default config;
