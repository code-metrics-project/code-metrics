import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

/**
 * Test suite for the new query page regression tests
 *
 * .serial ensures that the tests are run in serial, so as not
 * to overload the mock data server.
 */
test.describe.serial("New query page", () => {
  test.describe.configure({ timeout: 60_000 });

  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.NewQuery);
    await expect(page.locator("h2").filter({ hasText: "New Query" })).toBeVisible();
  });

  test("Executes coverage query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Code coverage");
    await helpers.selectWorkloads("athena");

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes LOC query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Lines of code");
    await helpers.selectWorkloads("athena");

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes new bugs query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("New bugs");
    await helpers.selectWorkloads("athena");

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes open bugs query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Open bugs");
    await helpers.selectWorkloads("athena");

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes pipeline durations query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Pipeline durations");
    await helpers.selectWorkloads("athena");
    await helpers.selectJobGroup("backend");

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes pipeline runs query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Pipeline runs");
    await helpers.selectWorkloads("athena");
    await helpers.selectJobGroup("backend");

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes PR open time query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("PR open time");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    const runButton = page.locator('button[name="runQuery"]');
    await runButton.click();
    // Wait for query execution: button changes to "Running query..." then back to "Run query"
    await expect(runButton).toHaveText("Running query...", { timeout: 5000 });
    await expect(runButton).toHaveText("Run query", { timeout: 60000 });
    await helpers.chartVisible(true);
  });

  test("Executes PR size query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("PR size");
    await helpers.selectWorkloads("gaia");

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes PRs per issue query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("PRs per issue");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDateDaysAgo(2);

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes issues per PR query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Issues per PR");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDateDaysAgo(2);

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes production incidents query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Production incidents");
    await helpers.selectWorkloads("athena");

    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Executes repo churn query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Repository churn");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    const runButton = page.locator('button[name="runQuery"]');
    await runButton.click();
    await expect(runButton).toHaveText("Running query...", { timeout: 5000 });
    await expect(runButton).toHaveText("Run query", { timeout: 60000 });
    await helpers.chartVisible(true);
  });

  test("Executes working pattern query", async ({ page, helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Working pattern");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    const runButton = page.locator('button[name="runQuery"]');
    await runButton.click();
    await expect(runButton).toHaveText("Running query...", { timeout: 5000 });
    await expect(runButton).toHaveText("Run query", { timeout: 60000 });
    await helpers.chartVisible(true);
  });
});
