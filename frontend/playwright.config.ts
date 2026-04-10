import { defineConfig, devices } from "@playwright/test";

const enableCoverage = process.env.COVERAGE_ENABLED === "true";

/**
 * Playwright configuration for CodeMetrics Frontend E2E tests.
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./__tests__/playwright/specs",
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use 2 workers on CI (ubuntu-latest has 2 cores), auto-detect locally */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html", { outputFolder: "__tests__/output/playwright-report" }], ["list"]],
  use: {
    baseURL: "http://code-metrics.localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  outputDir: "__tests__/output/playwright-results",
  webServer: {
    command: [
      enableCoverage ? "COVERAGE_ENABLED=true" : "",
      "VITE_BOOTSTRAP_RETRY_TIMEOUT=2000",
      "bun run dev",
    ]
      .filter(Boolean)
      .join(" "),
    url: "http://code-metrics.localhost:3001",
    reuseExistingServer: enableCoverage ? false : !process.env.CI,
    timeout: 120 * 1000,
  },
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  /* Global setup for coverage collection */
  globalSetup: enableCoverage ? "./__tests__/playwright/global-setup.ts" : undefined,
  globalTeardown: enableCoverage ? "./__tests__/playwright/global-teardown.ts" : undefined,
});
