import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

/**
 * Test suite for the new query page regression tests
 *
 * .serial ensures that the tests are run in serial, so as not
 * to overload the mock data server.
 *
 * Query runs use a 7-day window (UI default is 30) so mocks generate and
 * cache less historical data per run, while still leaving enough recent
 * mock PRs/commits for non-empty charts.
 */
test.describe.serial("New query page", () => {
  // Suite timeout must exceed run-button + chart waits (mocks can be slow on cold cache).
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.NewQuery);
    await expect(page.locator("h2").filter({ hasText: "New Query" })).toBeVisible({ timeout: 30_000 });
  });

  test("Executes coverage query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Code coverage");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes LOC query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Lines of code");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes new bugs query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("New bugs");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes open bugs query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Open bugs");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes pipeline durations query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Pipeline durations");
    await helpers.selectWorkloads("athena");
    await helpers.selectJobGroup("backend");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes pipeline runs query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Pipeline runs");
    await helpers.selectWorkloads("athena");
    await helpers.selectJobGroup("backend");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes PR open time query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("PR open time");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes PR size query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("PR size");
    await helpers.selectWorkloads("gaia");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes PRs per issue query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("PRs per issue");
    await helpers.selectWorkloads("athena");
    // 7 days (not 2): open-PR mocks are sparse; a 2-day window often yields an empty chart.
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes issues per PR query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Issues per PR");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes production incidents query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Production incidents");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes repo churn query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Repository churn");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });

  test("Executes working pattern query", async ({ helpers }) => {
    await helpers.chartVisible(false);
    await helpers.selectQuery("Working pattern");
    await helpers.selectWorkloads("athena");
    await helpers.setStartDatePreset(7);

    await helpers.runQueryAndWaitForChart();
  });
});
