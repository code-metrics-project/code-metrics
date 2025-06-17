import { Paths } from "../../../src/router/paths";

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
    cy.contains("No dashboards available.");
    cy.checkFooter();
  });
});

describe("Queries page", () => {
  it("Visits the saved queries url", () => {
    cy.login();
    cy.visit(Paths.SavedQueries);
    cy.contains("Saved Queries");
    cy.checkFooter();
  });
});

describe("New query page", () => {
  it("Visits the new query url", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");
    cy.checkFooter();
  });
});

describe("Programme codebase page", () => {
  it("Visits the Programme codebase url", () => {
    cy.login();
    cy.visit(Paths.ProgramMetrics);
    cy.contains("Code quality metric summary");
    cy.contains("Code quality metric history");
    cy.contains("Repository churn");
    cy.checkFooter();
  });
});

describe("Programme changes page", () => {
  it("Visits the programme changes url", () => {
    cy.login();
    cy.visit(Paths.ProgramNarratives);
    cy.contains("Repository changes");
    cy.checkFooter();
  });
});

describe("Programme pipeline page", () => {
  it("Visits the programme pipeline url", () => {
    cy.login();
    cy.visit(Paths.ProgramPipelineHealth);
    cy.contains("Pipeline health");
    cy.checkFooter();
  });
});

describe("Programme security page", () => {
  it("Visits the programme security url", () => {
    cy.login();
    cy.visit(Paths.ProgramSecurity);
    cy.contains("Security");
    cy.checkFooter();
  });
});
