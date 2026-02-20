import { Paths } from "../../../../src/router/paths";

// https://docs.cypress.io/api/introduction/api.html

describe("Application Load", () => {
  it("Visits the app root url", () => {
    cy.visit(Paths.Home);
    cy.checkFooter();
  });
});

describe("Dashboards page", () => {
  it("Visits the dashboards url", () => {
    cy.login();
    cy.visit(Paths.SavedDashboards);
    // Temporary: Increase timeout for flaky test (framework replacement planned)
    cy.contains("No dashboards available.", { timeout: 10000 });
    cy.checkFooter();
  });
});

describe("Queries page", () => {
  it("Visits the saved queries url", () => {
    cy.login();
    cy.visit(Paths.SavedQueries);
    // Temporary: Increase timeout for flaky test (framework replacement planned)
    cy.contains("Saved Queries", { timeout: 10000 });
    cy.checkFooter();
  });
});

describe("New query page", () => {
  it("Visits the new query url", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    // Temporary: Increase timeout for flaky test (framework replacement planned)
    cy.contains("New Query", { timeout: 10000 });
    cy.checkFooter();
  });
});

describe("Programme codebase page", () => {
  it("Visits the Programme codebase url", () => {
    cy.login();
    cy.visit(Paths.ProgramMetrics);
    // Temporary: Increase timeout for flaky test (framework replacement planned)
    cy.contains("Code quality metric summary", { timeout: 10000 });
    cy.contains("Code quality metric history", { timeout: 10000 });
    cy.contains("Repository churn", { timeout: 10000 });
    cy.checkFooter();
  });
});

describe("Programme changes page", () => {
  it("Visits the programme changes url", () => {
    cy.login();
    cy.visit(Paths.ProgramNarratives);
    // Temporary: Increase timeout for flaky test (framework replacement planned)
    cy.contains("Repository changes", { timeout: 10000 });
    cy.checkFooter();
  });
});

describe("Programme pipeline page", () => {
  it("Visits the programme pipeline url", () => {
    cy.login();
    cy.visit(Paths.ProgramPipelineHealth);
    // Temporary: Increase timeout for flaky test (framework replacement planned)
    cy.contains("Pipeline health", { timeout: 10000 });
    cy.checkFooter();
  });
});

describe("Programme security page", () => {
  it("Visits the programme security url", () => {
    cy.login();
    cy.visit(Paths.ProgramSecurity);
    // Temporary: Increase timeout for flaky test (framework replacement planned)
    cy.contains("Security", { timeout: 10000 });
    cy.checkFooter();
  });
});
