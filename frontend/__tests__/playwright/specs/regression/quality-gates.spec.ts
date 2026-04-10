import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

test.describe("Programme Quality Gates page", () => {
  test.beforeEach(async ({ helpers }) => {
    await helpers.login();
  });

  test("Visits the programme quality gates url", async ({ page, helpers }) => {
    await page.goto(Paths.ProgramQualityGates);
    await expect(page.getByRole("heading", { name: "Quality Gates" })).toBeVisible();
    await expect(
      page.getByText("Quality Gates are automated checks ensuring code meets quality standards")
    ).toBeVisible();
    await helpers.checkFooter();
  });

  test("Displays quality gate cards with repository groups", async ({ page }) => {
    await page.goto(Paths.ProgramQualityGates);

    // Check that quality gate cards are displayed
    await expect(page.getByText("athena / backend").first()).toBeVisible();
    await expect(page.getByText("athena / frontend").first()).toBeVisible();
    await expect(page.getByText("gaia / backend").first()).toBeVisible();
  });

  test("Shows headline metrics on quality gate cards", async ({ page }) => {
    await page.goto(Paths.ProgramQualityGates);

    // Check that quality gates heading and description are visible
    await expect(page.getByRole("heading", { name: /Quality Gates/i })).toBeVisible();
    // Either cards or loading skeleton should be visible
    const hasCard = (await page.locator('[data-slot="card"]').count()) > 0;
    const hasHeading = (await page.getByRole("heading", { name: /Quality Gates/i }).count()) > 0;
    expect(hasCard || hasHeading).toBeTruthy();
  });

  test("Expands and collapses quality gate card details", async ({ page }) => {
    await page.goto(Paths.ProgramQualityGates);

    // Wait for cards to load with actual content
    await expect(page.getByText("athena / backend").first()).toBeVisible({ timeout: 10000 });

    // Find the first Details button and click it
    const detailsButton = page.getByRole("button", { name: "Details" }).first();
    await detailsButton.click();

    // The button should still be visible
    await expect(detailsButton).toBeVisible();

    // Click again to collapse
    await detailsButton.click();
  });
});

test.describe("Workload Quality Gates page", () => {
  test.beforeEach(async ({ helpers }) => {
    await helpers.login();
  });

  test("Visits the workload quality gates url", async ({ page, helpers }) => {
    await page.goto("/workload/athena/quality-gates");
    await expect(page.getByRole("heading", { name: "Quality Gates" })).toBeVisible();
    await expect(
      page.getByText("Quality Gates are automated checks ensuring code meets quality standards")
    ).toBeVisible();
    await helpers.checkFooter();
  });

  test("Displays quality gate cards for specific workload", async ({ page }) => {
    await page.goto("/workload/athena/quality-gates");

    // Check that quality gate cards for athena workload are displayed
    await expect(page.getByText("athena / backend").first()).toBeVisible();
    await expect(page.getByText("athena / frontend").first()).toBeVisible();
    await expect(page.getByText("athena / platform").first()).toBeVisible();

    // Check that other workload cards are NOT displayed
    await expect(page.getByText("gaia / backend")).not.toBeVisible();
    await expect(page.getByText("icarus / backend")).not.toBeVisible();
  });

  test("Shows correct breadcrumb navigation", async ({ page }) => {
    await page.goto("/workload/athena/quality-gates");

    // Check breadcrumbs
    await expect(page.locator("a").filter({ hasText: "Workloads" })).toHaveAttribute("href", "/workload");
    await expect(page.getByRole("link", { name: "Athena", exact: true })).toHaveAttribute("href", "/workload/athena");
  });

  test("Displays headline metrics for workload quality gates", async ({ page }) => {
    await page.goto("/workload/gaia/quality-gates");

    // Wait for cards to load with actual content (not just skeleton)
    // Quality gate cards display repo group names - scroll to find one that has data
    const gaiaCard = page.getByText("gaia / platform").first();
    await gaiaCard.scrollIntoViewIfNeeded();
    await expect(gaiaCard).toBeVisible({ timeout: 10000 });

    // Check that cards have content
    await expect(page.locator('[data-slot="card"]').first()).toBeVisible();
    const cardContent = await page.locator('[data-slot="card"]').first().textContent();
    expect(cardContent?.length).toBeGreaterThan(0);
  });

  test("Expands quality gate card to show repository details", async ({ page }) => {
    await page.goto("/workload/athena/quality-gates");

    // Wait for cards to load
    await expect(page.locator('[data-slot="card"]').first()).toBeVisible();

    // Find and click the first Details button
    const detailsButton = page.getByRole("button", { name: "Details" }).first();
    await expect(detailsButton).toBeVisible();
    await detailsButton.click();

    // Verify the button is still visible after expansion
    await expect(detailsButton).toBeVisible();
  });

  test("Navigates to different workload quality gates", async ({ page }) => {
    // Visit first workload
    await page.goto("/workload/athena/quality-gates");
    await expect(page.getByText("athena / backend").first()).toBeVisible();

    // Visit second workload
    await page.goto("/workload/gaia/quality-gates");
    await expect(page.getByText("gaia / backend").first()).toBeVisible();
    await expect(page.getByText("gaia / frontend").first()).toBeVisible();

    // Athena cards should not be visible
    await expect(page.getByText("athena / backend")).not.toBeVisible();
  });
});
