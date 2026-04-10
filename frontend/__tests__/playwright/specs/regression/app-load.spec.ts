import { test, expect } from "../../fixtures";
import { Paths } from "../../../../src/router/paths";

test.describe("Application Load", () => {
  test("Visits the app root url", async ({ page, helpers }) => {
    await page.goto(Paths.Home);
    await helpers.checkFooter();
  });
});

test.describe("Dashboards page", () => {
  test("Visits the dashboards url", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.SavedDashboards);
    await expect(page.getByRole("heading", { name: "Saved Dashboards" })).toBeVisible();
    await helpers.checkFooter();
  });
});

test.describe("Queries page", () => {
  test("Visits the saved queries url", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.SavedQueries);
    await expect(page.getByRole("heading", { name: "Saved Queries" })).toBeVisible();
    await helpers.checkFooter();
  });
});

test.describe("New query page", () => {
  test("Visits the new query url", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.NewQuery);
    await expect(page.getByRole("heading", { name: "New Query" })).toBeVisible();
    await helpers.checkFooter();
  });
});

test.describe("Programme codebase page", () => {
  test("Visits the Programme codebase url", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.ProgramMetrics);
    await expect(page.getByText("Code quality metric summary").first()).toBeVisible();
    await expect(page.getByText("Code quality metric history").first()).toBeVisible();
    await expect(page.getByText("Repository churn").first()).toBeVisible();
    await helpers.checkFooter();
  });
});

test.describe("Programme changes page", () => {
  test("Visits the programme changes url", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.ProgramNarratives);
    await expect(page.getByText("Repository changes").first()).toBeVisible();
    await helpers.checkFooter();
  });
});

test.describe("Programme pipeline page", () => {
  test("Visits the programme pipeline url", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.ProgramPipelineHealth);
    await expect(page.getByRole("heading", { name: "Pipeline health" })).toBeVisible();
    await helpers.checkFooter();
  });
});

test.describe("Programme security page", () => {
  test("Visits the programme security url", async ({ page, helpers }) => {
    await helpers.login();
    await page.goto(Paths.ProgramSecurity);
    await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();
    await helpers.checkFooter();
  });
});
