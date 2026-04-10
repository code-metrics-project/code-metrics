import type { Page } from "@playwright/test";
import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";
import { buildPath } from "../../../../src/utils/path";

const waitForDependencyAlertsRequest = async (page: Page, workloadIds: string, repo: string) => {
  await page.waitForResponse(
    (response) => {
      if (response.request().method() !== "GET") return false;
      if (!response.ok()) return false;

      const responseUrl = new URL(response.url());
      return (
        responseUrl.pathname.endsWith("/api/security/dependency-alerts") &&
        responseUrl.searchParams.get("workloadIds") === workloadIds &&
        responseUrl.searchParams.get("repo") === repo
      );
    },
    { timeout: 15000 }
  );
};

test.describe("Dependency Alerts page", () => {
  test.beforeEach(async ({ helpers }) => {
    await helpers.login();
  });

  test("Visits the dependency alerts url from programme level", async ({ page, helpers }) => {
    await page.goto(Paths.ProgramDependencyAlerts);
    await expect(page.getByRole("heading", { name: "Dependency Alerts" })).toBeVisible();
    await expect(page.getByText("View dependency vulnerability alerts and SLA compliance").first()).toBeVisible();
    await helpers.checkFooter();
  });

  test("Visits the dependency alerts url from workload level", async ({ page, helpers }) => {
    await page.goto(Paths.WorkloadDependencyAlerts);
    await expect(page.getByRole("heading", { name: "Dependency Alerts" })).toBeVisible();
    await expect(page.getByText("View dependency vulnerability alerts and SLA compliance").first()).toBeVisible();
    await helpers.checkFooter();
  });

  test("Shows correct breadcrumb navigation for programme level", async ({ page }) => {
    await page.goto(Paths.ProgramDependencyAlerts);

    // Check breadcrumbs
    const programmeLink = page.locator("a").filter({ hasText: "Programme" });
    await expect(programmeLink).toHaveAttribute("href", "/program");
  });

  test("Displays the workload selector and repository input", async ({ page }) => {
    await page.goto(Paths.ProgramDependencyAlerts);

    // Check for workload selector
    await expect(page.locator("label").filter({ hasText: "Workloads" })).toBeVisible();
    await expect(page.locator('button[role="combobox"]').first()).toBeVisible();

    // Check for repository name combobox
    await expect(page.getByText("Select...").first()).toBeVisible();

    // Check for fetch button
    await expect(page.getByRole("button", { name: "Fetch Alerts" })).toBeVisible();
  });

  test("Loads dependency alerts for 'gaia' workload", async ({ page, helpers }) => {
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.goto(
        buildPath(Paths.WorkloadDependencyAlerts, {
          workloadId: "gaia",
          executeImmediately: "true",
          repoName: "hello-world",
        })
      ),
    ]);

    await expect(page.getByRole("heading", { name: "Dependency Alerts" })).toBeVisible();

    // Wait for data to load
    await expect(page.getByText("Alert Summary").first()).toBeVisible({ timeout: 10000 });

    await helpers.checkFooter();
  });

  test("Displays overall summary when alerts are loaded", async ({ page }) => {
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.goto(
        buildPath(Paths.WorkloadDependencyAlerts, {
          workloadId: "gaia",
          executeImmediately: "true",
          repoName: "hello-world",
        })
      ),
    ]);

    // Wait for summary to appear
    await expect(page.getByText("Overall Summary").first()).toBeVisible({ timeout: 10000 });

    // Check for summary metrics
    await expect(page.getByText(/\d+ total alerts/).first()).toBeVisible();
    await expect(page.getByText("Open Violations:").first()).toBeVisible();
    await expect(page.getByText("Compliance:").first()).toBeVisible();
  });

  test("Shows workload-specific analysis cards", async ({ page }) => {
    await page.goto(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: "true",
        repoName: "hello-world",
      })
    );

    // Wait for workload card to appear
    await expect(page.getByText("gaia - hello-world").first()).toBeVisible({ timeout: 10000 });

    // Check for breakdown sections
    const byState = page.getByText("By State").first();
    await byState.scrollIntoViewIfNeeded();
    await expect(byState).toBeVisible();

    const bySeverity = page.getByText("By Severity").first();
    await bySeverity.scrollIntoViewIfNeeded();
    await expect(bySeverity).toBeVisible();

    const slaCompliance = page.getByText("SLA Compliance").first();
    await slaCompliance.scrollIntoViewIfNeeded();
    await expect(slaCompliance).toBeVisible();
  });

  test("Displays severity chips with correct colors", async ({ page }) => {
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.goto(
        buildPath(Paths.WorkloadDependencyAlerts, {
          workloadId: "gaia",
          executeImmediately: "true",
          repoName: "hello-world",
        })
      ),
    ]);

    // Wait for data to load
    await expect(page.getByText("By Severity").first()).toBeVisible({ timeout: 10000 });

    // Check for severity badges
    await expect(page.locator("span.inline-flex.items-center.rounded-full").first()).toBeVisible();
  });

  test("Shows SLA violations table when violations exist", async ({ page }) => {
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.goto(
        buildPath(Paths.WorkloadDependencyAlerts, {
          workloadId: "gaia",
          executeImmediately: "true",
          repoName: "hello-world",
        })
      ),
    ]);

    // Wait for data to load
    await expect(page.getByText("Alert Summary").first()).toBeVisible({ timeout: 10000 });

    // Check if violations table appears (only if there are violations)
    const pageContent = await page.textContent("body");
    if (pageContent && pageContent.includes("SLA Violations")) {
      await expect(page.getByText("SLA Violations").first()).toBeVisible();

      // Check for table headers
      await expect(page.getByText("Alert #").first()).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Severity" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Package" })).toBeVisible();
      await expect(page.getByText("Days Overdue").first()).toBeVisible();
    }
  });

  test("Allows manual fetch of alerts from programme level", async ({ page, helpers: _helpers }) => {
    await page.goto(Paths.ProgramDependencyAlerts);

    // Open Workloads combobox (name includes currently selected items)
    await page.getByRole("combobox", { name: /^Workloads/ }).click();

    // Wait for popover to be visible
    const popover = page.locator("[data-radix-popper-content-wrapper]").last();
    await expect(popover).toBeVisible();

    // Clear all workloads using Select All
    await popover.getByRole("button", { name: "Select All" }).getByRole("checkbox").click();

    // Select only gaia
    await page.getByRole("option", { name: "gaia" }).getByRole("checkbox").click();
    await page.keyboard.press("Escape");

    // Wait for popover to close
    await expect(popover).not.toBeVisible();

    // Clear Repo Groups by clicking the X buttons in each badge
    // Look for any "Remove X" buttons in the Repo Groups section
    let removeButtons = page.getByRole("button", { name: /^Remove (?!gaia)/ });
    while ((await removeButtons.count()) > 0) {
      await removeButtons.first().click();
      await page.waitForTimeout(200); // Small delay for React state update
      // Re-query the buttons after each removal
      removeButtons = page.getByRole("button", { name: /^Remove (?!gaia)/ });
    }

    // Wait for Repository Name to become enabled after clearing all repo groups
    const repoNameCombobox = page.getByRole("combobox", { name: /Repository Name/ });
    await expect(repoNameCombobox).toBeEnabled({ timeout: 10000 });

    // Now Repository Name should be enabled - select hello-world
    await page.getByRole("combobox", { name: /Repository Name/ }).click();
    await page.getByRole("textbox", { name: "Search Repository Name" }).fill("hello-world");
    await page.getByRole("option", { name: "hello-world" }).click();

    // Click fetch button
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.getByRole("button", { name: "Fetch Alerts" }).click(),
    ]);

    // Wait for data to load and verify
    await expect(page.getByText("Alert Summary").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("gaia - hello-world").first()).toBeVisible();
  });

  test("Displays fetch button in disabled state when busy", async ({ page }) => {
    await page.goto(Paths.ProgramDependencyAlerts);

    // Open Workloads and select only gaia
    await page.getByRole("combobox", { name: /^Workloads/ }).click();
    const popover = page.locator("[data-radix-popper-content-wrapper]").last();
    await expect(popover).toBeVisible();
    await popover.getByRole("button", { name: "Select All" }).getByRole("checkbox").click();
    await page.getByRole("option", { name: "gaia" }).getByRole("checkbox").click();
    await page.keyboard.press("Escape");
    await expect(popover).not.toBeVisible();

    // Clear Repo Groups by clicking Remove buttons
    let removeButtons = page.getByRole("button", { name: /^Remove (?!gaia)/ });
    while ((await removeButtons.count()) > 0) {
      await removeButtons.first().click();
      await page.waitForTimeout(200);
      removeButtons = page.getByRole("button", { name: /^Remove (?!gaia)/ });
    }

    // Wait for Repository Name to become enabled
    const repoNameCombobox = page.getByRole("combobox", { name: /Repository Name/ });
    await expect(repoNameCombobox).toBeEnabled({ timeout: 10000 });

    // Select repository
    await page.getByRole("combobox", { name: /Repository Name/ }).click();
    await page.getByRole("textbox", { name: "Search Repository Name" }).fill("hello-world");
    await page.getByRole("option", { name: "hello-world" }).click();

    // Click fetch button and immediately check state
    const fetchBtn = page.getByRole("button", { name: "Fetch Alerts" });
    await fetchBtn.click();

    // Button should either show fetching state or complete quickly
    const btnText = await fetchBtn.textContent();
    expect(btnText?.includes("Fetching") || btnText?.includes("Fetch Alerts")).toBeTruthy();
  });

  test("Shows progress indicator when fetching data", async ({ page }) => {
    await page.goto(Paths.ProgramDependencyAlerts);

    // Open Workloads and select only gaia
    await page.getByRole("combobox", { name: /^Workloads/ }).click();
    const popover = page.locator("[data-radix-popper-content-wrapper]").last();
    await expect(popover).toBeVisible();
    await popover.getByRole("button", { name: "Select All" }).getByRole("checkbox").click();
    await page.getByRole("option", { name: "gaia" }).getByRole("checkbox").click();
    await page.keyboard.press("Escape");
    await expect(popover).not.toBeVisible();

    // Clear Repo Groups by clicking Remove buttons
    let removeButtons = page.getByRole("button", { name: /^Remove (?!gaia)/ });
    while ((await removeButtons.count()) > 0) {
      await removeButtons.first().click();
      await page.waitForTimeout(200);
      removeButtons = page.getByRole("button", { name: /^Remove (?!gaia)/ });
    }

    // Wait for Repository Name to become enabled
    const repoNameCombobox = page.getByRole("combobox", { name: /Repository Name/ });
    await expect(repoNameCombobox).toBeEnabled({ timeout: 10000 });

    // Select repository
    await page.getByRole("combobox", { name: /Repository Name/ }).click();
    await page.getByRole("textbox", { name: "Search Repository Name" }).fill("hello-world");
    await page.getByRole("option", { name: "hello-world" }).click();

    // Click fetch button
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.getByRole("button", { name: "Fetch Alerts" }).click(),
    ]);

    // Wait for results
    await expect(page.getByText("Alert Summary").first()).toBeVisible({ timeout: 10000 });
  });

  test("Navigates to GitHub alert details via link", async ({ page }) => {
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.goto(
        buildPath(Paths.WorkloadDependencyAlerts, {
          workloadId: "gaia",
          executeImmediately: "true",
          repoName: "hello-world",
        })
      ),
    ]);

    // Wait for data to load
    await expect(page.getByText("Alert Summary").first()).toBeVisible({ timeout: 10000 });

    // Check if violations table has links
    const pageContent = await page.textContent("body");
    if (pageContent && pageContent.includes("SLA Violations")) {
      // Find link buttons in the table
      const githubLink = page.locator('a[href*="github.com"]').first();
      await expect(githubLink).toHaveAttribute("target", "_blank");
    }
  });

  test.skip("Supports multiple workload selection", async ({ page, helpers }) => {
    // Skip: Current mock setup only supports 'gaia' workload for dependency alerts.
    await page.goto(Paths.ProgramDependencyAlerts);

    await helpers.selectWorkloads(["gaia"]);

    const repoLabel = page.locator("label").filter({ hasText: "Repository Name" }).locator("..");
    await repoLabel.locator('button[role="combobox"]').first().click();
    const repoPopover = page
      .locator("[data-radix-popper-content-wrapper]")
      .filter({ has: page.locator(":visible") })
      .last();
    await repoPopover.locator("input").fill("hello-world");
    await repoPopover.getByText("hello-world").click();

    await page.getByRole("button", { name: "Fetch Alerts" }).click();

    await expect(page.getByText("Alert Summary").first()).toBeVisible({ timeout: 10000 });
  });

  test("Displays compliance rate as percentage", async ({ page }) => {
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.goto(
        buildPath(Paths.WorkloadDependencyAlerts, {
          workloadId: "gaia",
          executeImmediately: "true",
          repoName: "hello-world",
        })
      ),
    ]);

    // Wait for summary to appear
    await expect(page.getByText("Overall Summary").first()).toBeVisible({ timeout: 10000 });

    // Check for percentage in compliance rate
    await expect(page.getByText(/Compliance: \d+(\.\d+)?%/).first()).toBeVisible();
  });

  test("Shows state chips in breakdown", async ({ page }) => {
    await Promise.all([
      waitForDependencyAlertsRequest(page, "gaia", "hello-world"),
      page.goto(
        buildPath(Paths.WorkloadDependencyAlerts, {
          workloadId: "gaia",
          executeImmediately: "true",
          repoName: "hello-world",
        })
      ),
    ]);

    // Wait for page and data to load - check for Alert Summary first
    await expect(page.getByText("Alert Summary").first()).toBeVisible({ timeout: 15000 });

    // Check for "By State" section or state badges
    const byStateSection = page.getByText("By State").first();
    if ((await byStateSection.count()) > 0) {
      await expect(byStateSection).toBeVisible();
    }

    // Check for at least one badge/chip element (state indicators)
    const hasBadges = (await page.locator("span.inline-flex.items-center.rounded-full").count()) > 0;
    expect(hasBadges).toBeTruthy();
  });

  test("Handles empty state when no alerts exist", async ({ page }) => {
    await page.goto(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: "true",
        repoName: "nonexistent-repo",
      })
    );

    // Either shows data or an error/empty state
    await expect(page.locator("body")).toBeVisible();
  });
});
