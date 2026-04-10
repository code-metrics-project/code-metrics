import { FullConfig } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

function resolveCoverageProfile(): "e2e" | "oidc" | "keycloak" {
  const profile = process.env.COVERAGE_PROFILE;
  if (profile === "oidc" || profile === "keycloak") {
    return profile;
  }
  return "e2e";
}

/**
 * Global setup for Playwright tests with coverage collection.
 * This sets up coverage instrumentation when COVERAGE_ENABLED=true.
 */
async function globalSetup(_config: FullConfig): Promise<void> {
  const coverageEnabled = process.env.COVERAGE_ENABLED === "true";

  if (!coverageEnabled) {
    return;
  }

  console.log("Coverage collection enabled - initializing...");

  // Clean and recreate coverage output directories
  const coverageProfile = resolveCoverageProfile();
  const coverageDir = path.join(process.cwd(), `coverage-frontend--${coverageProfile}`);
  if (fs.existsSync(coverageDir)) {
    fs.rmSync(coverageDir, { recursive: true, force: true });
  }
  fs.mkdirSync(coverageDir, { recursive: true });

  // Clean and recreate .nyc_output directory for intermediate coverage data
  const nycOutputDir = path.join(process.cwd(), ".nyc_output_playwright");
  if (fs.existsSync(nycOutputDir)) {
    fs.rmSync(nycOutputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(nycOutputDir, { recursive: true });

  console.log("Coverage directories initialized");
}

export default globalSetup;
