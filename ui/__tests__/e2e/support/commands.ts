import { Paths } from "../../../src/router/paths";

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//

Cypress.Commands.add("login", () => {
  cy.visit(Paths.Login);
  cy.get('input[name="username"]').type("admin");
  cy.get('input[name="password"]').type("admin");
  cy.get('button[type="submit"]').click();
  cy.contains("Logout", { timeout: 10000 }).should("be.visible");
});

Cypress.Commands.add("checkFooter", () => {
  cy.contains("strong", "Deloitte Digital"); // Footer text
});

Cypress.Commands.add("getComboboxItem", (comboboxName, item) => {
  cy.get(`input[name="${comboboxName}"]`).click({ force: true });
  return cy.get(".v-overlay-container .v-list-item").contains(item) as unknown as Cypress.Chainable<Element>;
});

Cypress.Commands.add("selectQuery", (queryTitle) => {
  cy.getComboboxItem("queryTypes", queryTitle).click();
  cy.get(`input[name="queryTypes"]`).type(`{esc}`);
});

Cypress.Commands.add("ensureFilterVisible", (inputElementName, inputTitle) => {
  if (!Cypress.$(`input[name="${inputElementName}"]`).length) {
    cy.log(`Adding ${inputElementName} input to filter`);
    cy.get("button[name='add-filter']").click();
    cy.get(".v-overlay-container .v-list-item").contains(inputTitle).click();
  } else {
    cy.log(`Input ${inputElementName} already present`);
  }
});

Cypress.Commands.add("selectJobGroup", (jobGroup) => {
  cy.ensureFilterVisible("jobGroups", "Job groups");
  cy.getComboboxItem("jobGroups", jobGroup).click();
  cy.get(`input[name="jobGroups"]`).type(`{esc}`);
});

Cypress.Commands.add("selectRepoGroup", (repoGroup) => {
  cy.ensureFilterVisible("repoGroups", "Repository groups");
  cy.getComboboxItem("repoGroups", repoGroup).click();
  cy.get(`input[name="repoGroups"]`).type(`{esc}`);
});

Cypress.Commands.add("clickWorkloadItem", (workload) => {
  cy.ensureFilterVisible("workloads", "Workloads");
  cy.getComboboxItem("workloads", workload).click();
  cy.get(`input[name="workloads"]`).type(`{esc}`);
});

Cypress.Commands.add("chartVisible", (visible) => {
  cy.get(`div[class="vue-apexcharts"]`, { timeout: 10000 }).should(visible ? "exist" : "not.exist");
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(): Chainable<Element>;
      checkFooter(): Chainable<Element>;
      getComboboxItem(comboboxName: string, item: string): Chainable<Element>;
      selectQuery(queryTitle: string): Chainable<Element>;
      ensureFilterVisible(inputElementName: string, inputTitle: string): Chainable<Element>;
      selectJobGroup(jobGroup: string): Chainable<Element>;
      selectRepoGroup(repoGroup: string): Chainable<Element>;
      clickWorkloadItem(workload: string): Chainable<Element>;
      chartVisible(visible: boolean): Chainable<Element>;
    }
  }
}
