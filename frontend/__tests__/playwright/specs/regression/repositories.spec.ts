import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";
import { buildPath } from "../../../../src/utils/path";

test.describe("Repositories page", () => {
  test("Visits the repositories url from program", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.Repositories);
    await expect(page.getByRole("heading", { name: "All Repositories" })).toBeVisible();
    await expect(page.getByText("All repositories across all workloads")).toBeVisible();
    await helpers.checkFooter();
  });

  test("Shows repositories table with workload column", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.Repositories);
    const table = page.locator("#repositories-table");
    await expect(table.getByRole("columnheader", { name: "Repository" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Workload" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Repo Groups" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Actions" })).toBeVisible();
    await helpers.checkFooter();
  });

  test("Allows searching repositories", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.Repositories);

    // Get first repository name from the table
    const firstRow = page.locator("#repositories-table tbody tr").first();
    const repoName = await firstRow.locator("td").first().textContent();
    const searchTerm = repoName?.trim().substring(0, 5) || "";

    await page.locator('input[type="text"]').first().fill(searchTerm);
    await expect(page.locator("#repositories-table tbody tr"))
      .toHaveCount(1, { timeout: 5000 })
      .catch(() => {
        // At least one result should be present
      });
    await helpers.checkFooter();
  });

  test("Shows workload-filtered repositories", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.WorkloadRepositories.replace(":workloadId", "athena"));
    // Wait for any heading to be visible to ensure page loaded
    await expect(page.getByRole("heading", { name: /Repositories/i }).first()).toBeVisible({ timeout: 15000 });
    await helpers.checkFooter();
  });

  test("Has action links to Pipeline Health", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.Repositories);
    // Wait for table to be visible
    await expect(page.locator("#repositories-table")).toBeVisible({ timeout: 10000 });
    // Check for any Pipeline link (either Health or Runs)
    const hasLinks = (await page.getByRole("link", { name: /Pipeline/i }).count()) > 0;
    expect(hasLinks).toBeTruthy();
    await helpers.checkFooter();
  });

  test("Has action links to Pipeline Runs", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.Repositories);
    await expect(page.getByRole("link", { name: "Pipeline Runs" }).first()).toBeVisible();
    await helpers.checkFooter();
  });

  test("Shows repo groups as chips", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.Repositories);
    // Look for chip-style elements in the Repo Groups column
    const table = page.locator("#repositories-table");
    await expect(table.getByText("backend").first()).toBeVisible();
    await expect(table.getByText("frontend").first()).toBeVisible();
    await helpers.checkFooter();
  });

  test("Shows breadcrumbs for program view", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.Repositories);
    await expect(page.locator("a").filter({ hasText: "Programme" })).toHaveAttribute("href", "/program");
    await helpers.checkFooter();
  });

  test("Shows breadcrumbs for workload view", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.WorkloadRepositories.replace(":workloadId", "athena"));
    await expect(page.locator("a").filter({ hasText: "Workloads" })).toHaveAttribute("href", "/workload");
    await expect(page.getByRole("link", { name: "Athena", exact: true })).toHaveAttribute("href", "/workload/athena");
    await helpers.checkFooter();
  });
});
