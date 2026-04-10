/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Coverage collection fixture for Playwright tests.
 * Automatically collects coverage data after each test when COVERAGE_ENABLED=true.
 */
export const testWithCoverage = base.extend({
  page: async ({ page }, use) => {
    const coverageEnabled = process.env.COVERAGE_ENABLED === "true";

    // Use the page as normal
    await use(page);

    // After test, collect coverage if enabled
    if (coverageEnabled) {
      try {
        // Get coverage data from the page
        const coverage = await page.evaluate(() => {
          // @ts-expect-error - __coverage__ is injected by istanbul
          return window.__coverage__;
        });

        if (coverage) {
          const nycOutputDir = path.join(process.cwd(), ".nyc_output_playwright");
          if (!fs.existsSync(nycOutputDir)) {
            fs.mkdirSync(nycOutputDir, { recursive: true });
          }

          // Write coverage data to a unique file
          const coverageFile = path.join(nycOutputDir, `coverage-${uuidv4()}.json`);
          fs.writeFileSync(coverageFile, JSON.stringify(coverage));
        }
      } catch (error) {
        // Coverage collection failed - this is non-fatal
        console.warn("Could not collect coverage:", error);
      }
    }
  },
});
