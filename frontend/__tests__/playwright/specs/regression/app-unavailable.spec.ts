import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

const APP_UNAVAILABLE_TITLE = "Couldn't reach the CodeMetrics API to fetch basic configuration.";
const APP_UNAVAILABLE_DESCRIPTION =
  "Please check the API is running and that the connection details are correct, then refresh the page.";
const APP_UNAVAILABLE_ACTION = "Refresh Page";
const BOOTSTRAP_WAITING_COPY = "CodeMetrics is currently waiting for the backend services...";

/**
 * These tests verify the AppUnavailable error page is shown when the backend
 * is unreachable. Because fetchSystemBootstrap() retries with a timeout
 * (shortened to 2 s for E2E via VITE_BOOTSTRAP_RETRY_TIMEOUT in the
 * Playwright config), the error page appears after the retry loop exhausts
 * rather than immediately.
 */
test.describe("App Unavailable", () => {
  test("Shows pre-load timeout error dialog when app bundle never loads", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __CM_LOADING_TIMEOUT_MS__?: number }).__CM_LOADING_TIMEOUT_MS__ = 300;
    });

    await page.route("**/config.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          apiBaseUrl: "",
          logLevel: "debug",
        }),
      });
    });

    await page.route("**/api/system/bootstrap", async (route) => {
      await route.abort("failed");
    });

    await page.goto(Paths.Home);

    const timeoutAlert = page.getByTestId("bootstrap-timeout-alert");
    await expect(timeoutAlert).toBeVisible({ timeout: 10000 });
    await expect(timeoutAlert.getByRole("heading", { level: 2, name: APP_UNAVAILABLE_TITLE })).toBeVisible();
    await expect(timeoutAlert.getByText(APP_UNAVAILABLE_DESCRIPTION)).toBeVisible();
    await expect(timeoutAlert.getByRole("button", { name: APP_UNAVAILABLE_ACTION })).toBeVisible();
  });

  test("Does not show pre-load timeout error dialog before timeout elapses", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __CM_LOADING_TIMEOUT_MS__?: number }).__CM_LOADING_TIMEOUT_MS__ = 5000;
    });

    await page.route("**/config.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          apiBaseUrl: "",
          logLevel: "debug",
        }),
      });
    });

    await page.route("**/api/system/bootstrap", async (route) => {
      await route.abort("failed");
    });

    await page.goto(Paths.Home);

    await expect(page.getByText(BOOTSTRAP_WAITING_COPY)).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.getByTestId("bootstrap-timeout-alert")).toBeHidden();
    await expect(page.getByRole("heading", { level: 2, name: APP_UNAVAILABLE_TITLE })).toBeHidden();
    await expect(page.getByText(APP_UNAVAILABLE_DESCRIPTION)).toBeHidden();
    await expect(page.getByRole("button", { name: APP_UNAVAILABLE_ACTION })).toBeHidden();
  });

  test("Shows error page when API is unavailable on initial load", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __CM_LOADING_TIMEOUT_MS__?: number }).__CM_LOADING_TIMEOUT_MS__ = 300;
    });

    // Intercept config.json to succeed but bootstrap to fail
    await page.route("**/config.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          apiBaseUrl: "",
          logLevel: "debug",
        }),
      });
    });

    await page.route("**/api/system/bootstrap", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto(Paths.Home);

    const timeoutAlert = page.getByTestId("bootstrap-timeout-alert");
    await expect(timeoutAlert).toBeVisible({ timeout: 10000 });
    await expect(timeoutAlert.getByRole("heading", { level: 2, name: APP_UNAVAILABLE_TITLE })).toBeVisible();
    await expect(timeoutAlert.getByText(APP_UNAVAILABLE_DESCRIPTION)).toBeVisible();
    await expect(timeoutAlert.getByRole("button", { name: APP_UNAVAILABLE_ACTION })).toBeVisible();
  });

  test("Shows error page when config.json fails to load", async ({ page }) => {
    // Intercept config.json to fail — no retry on web config, so this is immediate
    await page.route("**/config.json", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto(Paths.Home);

    // config.json has no retry logic, so error page appears immediately
    await expect(page.getByRole("heading", { level: 1, name: APP_UNAVAILABLE_TITLE })).toBeVisible();
    await expect(page.getByText(APP_UNAVAILABLE_DESCRIPTION)).toBeVisible();
    await expect(page.getByRole("button", { name: APP_UNAVAILABLE_ACTION })).toBeVisible();
  });

  test("Shows error page when API returns network error", async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __CM_LOADING_TIMEOUT_MS__?: number }).__CM_LOADING_TIMEOUT_MS__ = 300;
    });

    await page.route("**/config.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          apiBaseUrl: "",
          logLevel: "debug",
        }),
      });
    });

    // Simulate a network error — retry loop will exhaust
    await page.route("**/api/system/bootstrap", async (route) => {
      await route.abort("failed");
    });

    await page.goto(Paths.Home);

    const timeoutAlert = page.getByTestId("bootstrap-timeout-alert");
    await expect(timeoutAlert).toBeVisible({ timeout: 10000 });
    await expect(timeoutAlert.getByRole("heading", { level: 2, name: APP_UNAVAILABLE_TITLE })).toBeVisible();
    await expect(timeoutAlert.getByText(APP_UNAVAILABLE_DESCRIPTION)).toBeVisible();
    await expect(timeoutAlert.getByRole("button", { name: APP_UNAVAILABLE_ACTION })).toBeVisible();
  });
});
