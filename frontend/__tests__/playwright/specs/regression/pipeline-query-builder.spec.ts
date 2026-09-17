import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";
import { buildPath } from "../../../../src/utils/path";

test.describe("Program pipeline query builder page", () => {
  test.beforeEach(async ({ helpers }) => {
    await helpers.login();
  });

  test("Visits the program pipeline query builder url", async ({ page, helpers }) => {
    await page.goto(Paths.ProgramPipelineQueryBuilder);
    await expect(page.getByRole("heading", { name: "Pipeline query builder" })).toBeVisible();
    await helpers.checkFooter();
  });
});

test.describe("Workload pipeline query builder page", () => {
  test.beforeEach(async ({ helpers }) => {
    await helpers.login();
  });

  test("Visits the workload pipeline query builder url", async ({ page, helpers }) => {
    await page.goto(buildPath(Paths.WorkloadPipelineQueryBuilder, { workloadId: "athena" }));
    await expect(page.getByRole("heading", { name: "Pipeline query builder" })).toBeVisible();
    await helpers.checkFooter();
  });

  test("Executes a pipeline query on the workload query builder", async ({ page, helpers }) => {
    await page.goto(
      buildPath(Paths.WorkloadPipelineQueryBuilder, {
        workloadId: "athena",
        executeImmediately: "true",
        branchName: "main",
      })
    );
    await expect(page.getByRole("heading", { name: "Pipeline query builder" })).toBeVisible();
    // Wait for the auto-executed query to complete.
    const body = page.locator("body");
    await expect(body).toContainText(/Pipeline health|No data available|\d+%/i, { timeout: 15000 });
    await helpers.checkFooter();
  });
});
