import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

test.describe("Saved queries", () => {
  // This test creates/saves a query and tests the flow
  test("Saves a query", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.NewQuery);
    await expect(page.getByRole("heading", { name: "New Query" })).toBeVisible();

    await helpers.chartVisible(false);
    await helpers.selectQuery("Code coverage");
    await helpers.selectWorkloads("athena");

    await page.locator('button[name="queryMenu"]').click();
    await page
      .locator("[data-radix-popper-content-wrapper]")
      .last()
      .locator("button")
      .filter({ hasText: "Save query" })
      .click();
    await page.locator('input[name="queryName"]').fill("Coverage query");
    await page.locator('button[name="setQueryName"]').click();
    await expect(page).toHaveURL(/\/explore\/query\/coverage-query/);
  });

  test("Runs the saved query", async ({ page, helpers }) => {
    // First save a query in this same session
    await helpers.login();
    await page.goto(Paths.NewQuery);
    await expect(page.getByRole("heading", { name: "New Query" })).toBeVisible();

    await helpers.chartVisible(false);
    await helpers.selectQuery("Code coverage");
    await helpers.selectWorkloads("athena");

    await page.locator('button[name="queryMenu"]').click();
    await page
      .locator("[data-radix-popper-content-wrapper]")
      .last()
      .locator("button")
      .filter({ hasText: "Save query" })
      .click();
    await page.locator('input[name="queryName"]').fill("Test query run");
    await page.locator('button[name="setQueryName"]').click();
    await expect(page).toHaveURL(/\/explore\/query\/test-query-run/);

    // Now test running it
    await expect(page.getByText("Test query run").first()).toBeVisible();
    await expect(page.getByText("Saved query").first()).toBeVisible();

    await helpers.chartVisible(false);
    await page.locator('button[name="runQuery"]').click();
    await helpers.chartVisible(true);
  });

  test("Deletes the saved query", async ({ page, helpers }) => {
    // First save a query in this same session
    await helpers.login();
    await page.goto(Paths.NewQuery);
    await expect(page.getByRole("heading", { name: "New Query" })).toBeVisible();

    await helpers.chartVisible(false);
    await helpers.selectQuery("Code coverage");
    await helpers.selectWorkloads("athena");

    await page.locator('button[name="queryMenu"]').click();
    await page
      .locator("[data-radix-popper-content-wrapper]")
      .last()
      .locator("button")
      .filter({ hasText: "Save query" })
      .click();
    await page.locator('input[name="queryName"]').fill("Test query delete");
    await page.locator('button[name="setQueryName"]').click();
    await expect(page).toHaveURL(/\/explore\/query\/test-query-delete/);

    // Now test deleting it
    await expect(page.getByText("Test query delete").first()).toBeVisible();
    await expect(page.getByText("Saved query").first()).toBeVisible();

    await page.locator('button[name="queryMenu"]').click();
    await page
      .locator("[data-radix-popper-content-wrapper]")
      .last()
      .locator("button")
      .filter({ hasText: "Delete query" })
      .click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page).toHaveURL(/\/explore\/query/);
  });
});
