import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

/**
 * RBAC Nav Link Smoke Tests
 *
 * Verifies that the Admin nav link is only visible to users with the admin role.
 */
test.describe("RBAC - Admin nav link", () => {
  test("shows Admin link in navbar after logging in as admin", async ({ page, helpers }) => {
    await helpers.login();

    // Desktop nav: an anchor/link with the text "Admin" should be visible
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible({ timeout: 10000 });
  });

  test("Admin nav link points to /admin", async ({ page, helpers }) => {
    await helpers.login();

    const adminLink = page.getByRole("link", { name: "Admin" }).first();
    await expect(adminLink).toHaveAttribute("href", Paths.AdminHome);
  });
});
