import type { JestConfigWithTsJest } from "ts-jest";

const enableCoverage = process.env.COVERAGE_ENABLED === "true";

const config: JestConfigWithTsJest = {
  preset: "ts-jest/presets/default-esm",
  runner: "groups",
  setupFilesAfterEnv: ["./src/tests/setup.js"],
  testMatch: ["**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)"],
  testEnvironment: "node",
  collectCoverage: enableCoverage,
  coverageReporters: ["json", "html", "lcov", "text"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@octokit/auth-app$": "<rootDir>/src/tests/mocks/octokit-auth-app.ts",
  },
  transformIgnorePatterns: ["/node_modules/(?!(?:@octokit|before-after-hook|universal-user-agent)/)"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "./tsconfig.json",
      },
    ],
  },
};

export default config;
