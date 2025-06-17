import { Paths } from "../../../src/router/paths";

const resizeObserverLoopErrRe = /ResizeObserver loop completed with undelivered notifications/;
Cypress.on("uncaught:exception", (err) => {
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false;
  }
});

describe("Saved queries", () => {
  it("Saves a query", () => {
    cy.login();
    cy.visit(Paths.NewQuery);
    cy.contains("New Query");

    cy.chartVisible(false);
    cy.selectQuery("Code coverage");
    cy.clickWorkloadItem("all");
    cy.clickWorkloadItem("athena");

    cy.get(`button[name="queryMenu"]`).click();
    cy.get(".v-list-item-action").contains("Save query").click();
    cy.get(`input[name="queryName"]`).type("Coverage query");
    cy.get(`button[name="setQueryName"]`).click();

    cy.url().should("include", "/explore/query/coverage-query");
  });

  it("Runs the saved query", () => {
    cy.login();
    cy.visit("/explore/query/coverage-query");
    cy.contains("Coverage query");
    cy.contains("Saved query");

    cy.chartVisible(false);
    cy.get(`button[name="runQuery"]`).click();
    cy.chartVisible(true);
  });

  it("Deletes the saved query", () => {
    cy.login();
    cy.visit("/explore/query/coverage-query");
    cy.contains("Coverage query");
    cy.contains("Saved query");

    cy.get(`button[name="queryMenu"]`).click();
    cy.get(".v-list-item-action").contains("Delete query").click();
    cy.get(`button[name="confirm"]`).click();

    cy.url().should("contain", "/explore/query");
  });
});
