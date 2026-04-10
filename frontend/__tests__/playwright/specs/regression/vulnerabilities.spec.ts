import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

/**
 * Vulnerabilities tests are separated because they depend on seeding data first.
 * The Vulnerabilities feature is push-based (SARIF ingestion from CI/CD pipelines),
 * not fetched from an external API like Dependency Alerts.
 *
 * These tests use the example SARIF files from fixtures to test the upload
 * functionality via the UI and subsequent querying of that data.
 *
 * Using test.describe.serial to ensure tests run in order - the query test
 * depends on the upload test having run first to seed the data.
 */
test.describe.serial("Vulnerabilities", () => {
  const workloadId = "athena";
  const repoName = "spring-petclinic";

  test("Uploads vulnerability data via the security page", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.ProgramSecurity);

    // Select workload
    await page.locator('button[role="combobox"]').first().click();
    await page.locator('[role="option"]').filter({ hasText: workloadId }).click();

    // Select repo
    await page.locator('button[role="combobox"]').nth(1).click();
    await page.locator('[role="option"]').filter({ hasText: repoName }).click();

    // Upload the SARIF file - use path relative to project root
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("__tests__/playwright/fixtures/example-comprehensive.sarif");

    await page.getByRole("button", { name: "Upload" }).click();
    await expect(page.getByText("SARIF file uploaded successfully")).toBeVisible();
  });

  test("Executes vulnerabilities query and displays chart", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.NewQuery);
    await expect(page.locator("h2").filter({ hasText: "New Query" })).toBeVisible();

    await helpers.chartVisible(false);
    await helpers.selectQuery("Vulnerabilities");
    await helpers.selectWorkloads(workloadId);

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });
});
