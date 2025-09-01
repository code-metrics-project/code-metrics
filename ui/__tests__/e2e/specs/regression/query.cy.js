import { Paths } from "../../../../src/router/paths";

const resizeObserverLoopErrRe = /ResizeObserver loop completed with undelivered notifications/;
Cypress.on("uncaught:exception", (err) => {
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false;
  }
});

describe("New query page", () => {
  it("Executes coverage query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Code coverage");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes LOC query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Lines of code");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes new bugs query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("New bugs");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes open bugs query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Open bugs");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes pipeline durations query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Pipeline durations");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");
    cy.selectJobGroup("backend");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes pipeline runs query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Pipeline runs");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");
    cy.selectJobGroup("backend");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes PR open time query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("PR open time");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes PR size query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("PR size");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("gaia");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes production incidents query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Production incidents");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes repo churn query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Repository churn");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");
    cy.selectRepoGroup("backend");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes vulnerabilities query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Vulnerabilities");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Executes working pattern query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Working pattern");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });
});
