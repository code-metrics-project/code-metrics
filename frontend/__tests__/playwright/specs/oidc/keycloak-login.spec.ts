import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

/**
 * Keycloak OIDC Authentication tests.
 * These tests require Keycloak to be running at http://localhost:8086
 */
test.describe("Keycloak OIDC Authentication", () => {
  test("Should authenticate with Keycloak and redirect back to the app", async ({ page }) => {
    test.setTimeout(30000);

    // Assumes OIDC authentication with Keycloak is enabled
    // It navigates through the Keycloak login flow
    await page.goto(Paths.Login);

    // The app should redirect to Keycloak
    // Wait for Keycloak login page
    await page.waitForURL(/localhost:8086/, { timeout: 10000 });

    // Fill out the Keycloak login form
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("admin");
    await page.locator("#kc-login").click();

    // After successful authentication, we should be redirected back to our app
    await page.waitForURL(/code-metrics\.localhost:3001/, { timeout: 10000 });
    await expect(page.getByText("Logout")).toBeVisible();

    // Check if we can access protected resources
    await page.goto(Paths.Home);
    await expect(page.getByText("Logout")).toBeVisible({ timeout: 10000 });

    // Check footer
    await expect(page.locator("strong").filter({ hasText: "Deloitte Digital" })).toBeVisible();
  });
});
