import process from "node:process";
import { defineConfig } from "cypress";
import codeCoverageTask from "@cypress/code-coverage/task";

const enableCoverage = process.env.COVERAGE_ENABLED === "true";

export default defineConfig({
  allowCypressEnv: false,
  expose: {
    coverage: enableCoverage,
  },
  e2e: {
    baseUrl: "http://localhost:3001",
    env: {
      COVERAGE_ENABLED: enableCoverage ? "true" : "false",
    },
    screenshotsFolder: "__tests__/output/screenshots",
    setupNodeEvents(on, config) {
      if (enableCoverage) {
        codeCoverageTask(on, config);
      }
      return config;
    },
    specPattern: "__tests__/e2e/specs/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "__tests__/e2e/support/e2e.ts",
    video: true,
    videosFolder: "__tests__/output/videos",
    videoCompression: 32,
    viewportWidth: 1920,
    viewportHeight: 1080,
  },
});
