import { defineConfig } from "cypress";
import codeCoverageTask from "@cypress/code-coverage/task.js";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3001",
    screenshotsFolder: "__tests__/output/screenshots",
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config);
      return config;
    },
    specPattern: "__tests__/e2e/specs/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "__tests__/e2e/support/e2e.ts",
    video: true,
    videosFolder: "__tests__/output/videos",
    videoCompression: 32,
  },
});
