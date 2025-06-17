import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: "ts-jest",
  runner: "groups",
  setupFilesAfterEnv: ["./src/tests/setup.js"],
  testMatch: ["**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)"],
  testEnvironment: "node",
  collectCoverage: true,
  coverageReporters: ["json", "html", "lcov", "text"],
  globals: {
    "ts-jest": {
      isolatedModules: false
    }
  }
};

export default config;
