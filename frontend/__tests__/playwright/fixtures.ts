/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, Page, expect, Locator } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { Paths } from "../../src/router/paths";

// Map field names to their actual label text for ShadCN Combobox
const fieldLabelMap: Record<string, string> = {
  queryTypes: "Data sources",
  jobGroups: "Job Groups",
  repoGroups: "Repo Groups",
  workloads: "Workloads",
};

/**
 * Helper class providing custom commands for CodeMetrics E2E tests.
 * Equivalent to Cypress custom commands.
 */
export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login with default admin credentials
   */
  async login(): Promise<void> {
    await this.page.goto(Paths.Login);
    // Wait for the login form to be visible (handles loading state)
    const usernameInput = this.page.locator('input#username, input[name="username"]').first();
    await usernameInput.waitFor({ state: "visible", timeout: 10000 });
    await usernameInput.fill("admin");
    await this.page.locator('input#password, input[name="password"]').first().fill("admin");
    await this.page.locator('button[type="submit"]').click();
    // Wait for successful login - the app renders after authentication
    await expect(this.page.getByText("Logout")).toBeVisible({ timeout: 10000 });
  }

  /**
   * Check that the footer contains expected text
   */
  async checkFooter(): Promise<void> {
    await expect(this.page.locator("strong").filter({ hasText: "Deloitte Digital" })).toBeVisible();
  }

  /**
   * Get the visible popover content
   */
  private getOpenPopoverContent(): Locator {
    // Radix popovers use data-radix-popper-content-wrapper
    // We want the last visible one (in case there are multiple)
    return this.page.locator("[data-radix-popper-content-wrapper]").last();
  }

  /**
   * Get a combobox item and click to open the dropdown
   */
  async getComboboxItem(comboboxName: string, item: string): Promise<Locator> {
    const labelText = fieldLabelMap[comboboxName] || comboboxName;
    const labelParent = this.page.locator("label").filter({ hasText: labelText }).locator("..");
    await labelParent.locator('button[role="combobox"]').first().click({ force: true });
    // Wait for popover to appear
    await expect(this.getOpenPopoverContent()).toBeVisible();
    // Find and return the matching item
    return this.getOpenPopoverContent().getByText(item, { exact: false });
  }

  /**
   * Select a query type from the dropdown
   */
  async selectQuery(queryTitle: string): Promise<void> {
    const item = await this.getComboboxItem("queryTypes", queryTitle);
    await item.click({ force: true });
    // Close the popover
    await this.page.keyboard.press("Escape");
    // Ensure the add-filter button is now visible
    await expect(this.page.locator("button[name='add-filter']")).toBeVisible();
  }

  /**
   * Ensure a filter is visible, adding it if necessary
   */
  async ensureFilterVisible(inputElementName: string, inputTitle: string): Promise<void> {
    const labelText = fieldLabelMap[inputElementName] || inputTitle;
    const labelExists = (await this.page.locator(`label:has-text("${labelText}")`).count()) > 0;
    const addFilterButtonExists = (await this.page.locator("button[name='add-filter']").count()) > 0;

    if (labelExists) {
      // Already visible
      return;
    } else if (addFilterButtonExists) {
      // Add the filter via add-filter button
      await this.page.locator("button[name='add-filter']").click();
      // Use .last() because multiple popovers can exist on the page
      await expect(this.page.locator("[data-radix-popper-content-wrapper]").last()).toBeVisible();
      await this.page
        .locator("[data-radix-popper-content-wrapper]")
        .last()
        .locator("button")
        .filter({ hasText: inputTitle })
        .click();
      await expect(this.page.locator("label").filter({ hasText: labelText })).toBeVisible();
    } else {
      // Wait for the label to appear
      await expect(this.page.locator("label").filter({ hasText: labelText })).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Select a job group
   */
  async selectJobGroup(jobGroup: string): Promise<void> {
    await this.ensureFilterVisible("jobGroups", "Job Groups");
    const item = await this.getComboboxItem("jobGroups", jobGroup);
    await item.click();
    await this.page.keyboard.press("Escape");
  }

  /**
   * Select a repo group
   */
  async selectRepoGroup(repoGroup: string): Promise<void> {
    await this.ensureFilterVisible("repoGroups", "Repository Groups");
    const item = await this.getComboboxItem("repoGroups", repoGroup);
    await item.click();
    await this.page.keyboard.press("Escape");
  }

  /**
   * Click a workload item
   */
  async clickWorkloadItem(workload: string): Promise<void> {
    await this.ensureFilterVisible("workloads", "Workloads");
    const item = await this.getComboboxItem("workloads", workload);
    await item.click();
    await this.page.keyboard.press("Escape");
  }

  /**
   * Deselect all checked options in an open combobox
   */
  private async deselectAllCheckedOptionsInOpenCombobox(): Promise<void> {
    const popover = this.getOpenPopoverContent();
    const checkedItems = popover
      .locator("div.max-h-60.overflow-y-auto")
      .locator('[data-slot="checkbox"][data-state="checked"]');
    const count = await checkedItems.count();
    if (count === 0) return;

    await checkedItems.first().locator("..").click({ force: true });
    await this.deselectAllCheckedOptionsInOpenCombobox();
  }

  /**
   * Clear all selections in an open combobox using Select All button
   * Based on recorded Playwright codegen output
   */
  private async clearAllSelectionsInOpenCombobox(): Promise<void> {
    // Use the exact selector from codegen recording
    const selectAllButton = this.page.getByRole("button", { name: "Select All" });
    const selectAllExists = (await selectAllButton.count()) > 0;

    if (selectAllExists) {
      const checkbox = selectAllButton.getByRole("checkbox");
      const isChecked = await checkbox.isChecked();

      if (isChecked) {
        // Click to uncheck all
        await checkbox.click();
        await expect(checkbox).not.toBeChecked();
        return;
      }
    }

    // Fall back to deselecting items one by one
    await this.deselectAllCheckedOptionsInOpenCombobox();
  }

  /**
   * Select one or more workloads
   */
  async selectWorkloads(workloads: string | string[]): Promise<void> {
    const desired = (Array.isArray(workloads) ? workloads : [workloads]).filter(Boolean);

    await this.ensureFilterVisible("workloads", "Workloads");

    const labelParent = this.page.locator("label").filter({ hasText: "Workloads" }).locator("..");
    await labelParent.locator('button[role="combobox"]').first().click({ force: true });
    await expect(this.getOpenPopoverContent()).toBeVisible();

    const popover = this.getOpenPopoverContent();
    // Wait for the combobox content to actually render options
    await expect(popover.locator('input[placeholder="Search..."]')).toBeVisible({ timeout: 10000 });

    // Clear any preselected workloads
    await this.clearAllSelectionsInOpenCombobox();

    if (desired.length === 0) {
      await this.page.keyboard.press("Escape");
      return;
    }

    // Select desired workloads using search and codegen selectors
    for (const workload of desired) {
      const searchInput = popover.locator('input[placeholder="Search..."]');
      await searchInput.clear();
      await searchInput.fill(workload);

      // Use the exact selector pattern from codegen: getByRole('option').getByRole('checkbox')
      const optionCheckbox = this.page.getByRole("option", { name: workload }).getByRole("checkbox");
      await expect(optionCheckbox).toBeVisible({ timeout: 10000 });
      await optionCheckbox.click();
      await expect(optionCheckbox).toBeChecked();
    }

    await this.page.keyboard.press("Escape");
  }

  /**
   * Clear all repo groups selections and wait for Repository Name to become enabled
   * Based on recorded Playwright codegen output
   */
  async clearRepoGroups(): Promise<void> {
    await this.ensureFilterVisible("repoGroups", "Repository Groups");

    // Open the Repo Groups combobox - name includes selected items
    // Use a regex to match any combobox that starts with "Repo Groups"
    const repoGroupsCombobox = this.page.getByRole("combobox", { name: /^Repo Groups/ });
    await repoGroupsCombobox.click();

    // Click Select All to deselect everything
    const selectAllButton = this.page.getByRole("button", { name: "Select All" });
    await expect(selectAllButton).toBeVisible({ timeout: 5000 });
    const checkbox = selectAllButton.getByRole("checkbox");

    // Only click if currently checked
    if (await checkbox.isChecked()) {
      await checkbox.click();
      await expect(checkbox).not.toBeChecked();
    }

    await this.page.keyboard.press("Escape");

    // Wait for Repository Name to become enabled (React state update)
    const repoNameCombobox = this.page.getByRole("combobox", { name: /Repository Name/ });
    await expect(repoNameCombobox).toBeEnabled({ timeout: 10000 });
  }

  /**
   * Check if chart is visible or not
   */
  async chartVisible(visible: boolean): Promise<void> {
    const chart = this.page.locator("div.recharts-wrapper");
    if (visible) {
      await expect(chart).toBeVisible({ timeout: 10000 });
    } else {
      await expect(chart).not.toBeVisible();
    }
  }

  /**
   * Set the start date using a preset button (7, 30, or 90 days ago)
   */
  async setStartDatePreset(daysAgo: 7 | 30 | 90): Promise<void> {
    await this.ensureFilterVisible("startDate", "Start Date");
    // Click the Start Date picker button to open the popover
    const labelParent = this.page.locator("label").filter({ hasText: "Start date" }).locator("..");
    await labelParent.locator("button").first().click();
    // Wait for popover and click the preset button
    await expect(this.page.locator("[data-radix-popper-content-wrapper]").last()).toBeVisible();
    await this.page.getByRole("button", { name: `${daysAgo} days ago` }).click();
  }
}

/**
 * Extended test fixture with helpers and automatic coverage collection.
 * Coverage is collected after each test when COVERAGE_ENABLED=true.
 */
export const test = base.extend<{ helpers: TestHelpers }>({
  helpers: async ({ page }, use) => {
    const helpers = new TestHelpers(page);
    await use(helpers);
  },
  page: async ({ page, context: _context }, use) => {
    const coverageEnabled = process.env.COVERAGE_ENABLED === "true";

    // Use the page as normal
    await use(page);

    // After test, collect coverage if enabled
    if (coverageEnabled) {
      try {
        // Get coverage data from the page
        const coverage = await page.evaluate(() => {
          return (window as unknown as { __coverage__?: Record<string, unknown> }).__coverage__;
        });

        if (coverage) {
          const nycOutputDir = path.join(process.cwd(), ".nyc_output_playwright");
          if (!fs.existsSync(nycOutputDir)) {
            fs.mkdirSync(nycOutputDir, { recursive: true });
          }

          // Write coverage data to a unique file
          const coverageFile = path.join(nycOutputDir, `coverage-${uuidv4()}.json`);
          fs.writeFileSync(coverageFile, JSON.stringify(coverage));
        }
      } catch (error) {
        // Coverage collection failed - this is non-fatal
        console.warn("Could not collect coverage:", error);
      }
    }
  },
});

export { expect };
