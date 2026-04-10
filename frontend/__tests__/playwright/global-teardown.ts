import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

function resolveCoverageProfile(): "e2e" | "oidc" | "keycloak" {
  const profile = process.env.COVERAGE_PROFILE;
  if (profile === "oidc" || profile === "keycloak") {
    return profile;
  }
  return "e2e";
}

/**
 * Global teardown for Playwright tests.
 * Generates coverage reports when COVERAGE_ENABLED=true.
 */
async function globalTeardown(): Promise<void> {
  const coverageEnabled = process.env.COVERAGE_ENABLED === "true";

  if (!coverageEnabled) {
    return;
  }

  console.log("Generating coverage reports...");

  const nycOutputDir = path.join(process.cwd(), ".nyc_output_playwright");
  const coverageProfile = resolveCoverageProfile();
  const coverageDir = path.join(process.cwd(), `coverage-frontend--${coverageProfile}`);

  // Check if we have coverage data
  if (fs.existsSync(nycOutputDir)) {
    const files = fs.readdirSync(nycOutputDir);
    if (files.length > 0) {
      try {
        // Use nyc to merge and report coverage
        execSync(`npx --yes nyc merge ${nycOutputDir} ${coverageDir}/coverage-final.json`, {
          stdio: "inherit",
        });
        execSync(
          `npx --yes nyc report --reporter=html --reporter=lcov --reporter=text --report-dir=${coverageDir} --temp-dir=${nycOutputDir}`,
          {
            stdio: "inherit",
          }
        );
        console.log("Coverage reports generated successfully");
      } catch (error) {
        console.error("Error generating coverage reports:", error);
      }
    } else {
      console.log("No coverage data collected");
    }
  }
}

export default globalTeardown;
