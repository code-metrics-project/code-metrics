import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

/**
 * OIDC Mock Authentication tests.
 * These tests require the OIDC mock server to be running at http://localhost:8080
 */
test.describe("OIDC Authentication", () => {
  test("Should authenticate with OIDC mock and redirect back to the app", async ({ page }) => {
    test.setTimeout(30000);

    // Assumes OIDC authentication with OIDC mock is enabled
    // It navigates through the OIDC mock login flow
    await page.goto(Paths.Login);

    // The app should redirect to the OIDC mock
    // Wait for OIDC mock login page
    await page.waitForURL(/localhost:8080/, { timeout: 10000 });

    // Fill out the OIDC mock login form
    await page.locator("#username").fill("admin");
    await page.locator("#password").fill("admin");
    await page.locator("body > div > form > button").click();

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
