import { test, expect } from "@playwright/test";
import { Paths } from "../../../../src/router/paths";

/**
 * Authentication Smoke Tests
 *
 * Verifies the login flow works correctly.
 */
test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("displays the login form", async ({ page }) => {
      await page.goto(Paths.Login);

      await expect(page.locator("input#username")).toBeVisible();
      await expect(page.locator("input#password")).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("shows the Sign In title", async ({ page }) => {
      await page.goto(Paths.Login);

      await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
    });

    test("successfully logs in with valid credentials", async ({ page }) => {
      await page.goto(Paths.Login);

      await page.locator("input#username").fill("admin");
      await page.locator("input#password").fill("admin");
      await page.locator('button[type="submit"]').click();

      // Just wait for the URL to change - if auth works, we'll redirect
      await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
    });
  });

  test.describe("Protected Routes", () => {
    test("redirects unauthenticated users to login", async ({ page }) => {
      await page.goto(Paths.SavedQueries);

      // Should be redirected to login page
      await expect(page).toHaveURL(/\/login/);
    });

    test("allows authenticated users to access protected pages", async ({ page }) => {
      // Login first
      await page.goto(Paths.Login);
      await page.locator("input#username").fill("admin");
      await page.locator("input#password").fill("admin");
      await page.locator('button[type="submit"]').click();
      await expect(page.getByText("Logout")).toBeVisible({ timeout: 10000 });

      await page.goto(Paths.SavedQueries);

      await expect(page).toHaveURL(/\/explore\/query/);
    });
  });
});
