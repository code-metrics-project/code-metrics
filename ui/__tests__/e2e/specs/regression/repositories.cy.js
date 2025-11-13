import { Paths } from "../../../../src/router/paths";
import { buildPath } from "../../../../src/utils/path";

describe("Repositories page", () => {
  it("Visits the repositories url from program", () => {
    cy.login();
    cy.visit(Paths.Repositories);
    cy.contains("All Repositories");
    cy.contains("All repositories across all workloads");
    cy.checkFooter();
  });

  it("Shows repositories table with workload column", () => {
    cy.login();
    cy.visit(Paths.Repositories);
    cy.contains("Repository");
    cy.contains("Workload");
    cy.contains("Repo Groups");
    cy.contains("Actions");
    cy.checkFooter();
  });

  it("Allows searching repositories", () => {
    cy.login();
    cy.visit(Paths.Repositories);
    // Get first repository name from the table
    cy.get("#repositories-table tbody tr")
      .first()
      .find("td")
      .first()
      .invoke("text")
      .then((repoName) => {
        const searchTerm = repoName.trim().substring(0, 5); // Use first 5 chars
        cy.get("input").filter('[type="text"]').first().type(searchTerm);
        cy.get("#repositories-table tbody tr").should("have.length.at.least", 1);
      });
    cy.checkFooter();
  });

  it("Shows workload-filtered repositories", () => {
    cy.login();
    cy.visit(`${Paths.WorkloadRepositories}?workloadId=athena`);
    cy.contains("Repositories - Athena team");
    cy.contains("Repositories in the Athena team workload.");
    // Workload column should not be present when filtered
    cy.get("#repositories-table").should("not.contain", "Workload");
    cy.checkFooter();
  });

  it("Has action links to Pipeline Health", () => {
    cy.login();
    cy.visit(Paths.Repositories);
    cy.contains("Pipeline Health").should("be.visible");
    cy.checkFooter();
  });

  it("Has action links to Pipeline Runs", () => {
    cy.login();
    cy.visit(Paths.Repositories);
    cy.contains("Pipeline Runs").should("be.visible");
    cy.checkFooter();
  });

  it("Shows repo groups as chips", () => {
    cy.login();
    cy.visit(Paths.Repositories);
    // Look for chip-style elements in the Repo Groups column
    cy.get("#repositories-table").within(() => {
      cy.contains("backend").should("be.visible");
      cy.contains("frontend").should("be.visible");
    });
    cy.checkFooter();
  });

  it("Shows breadcrumbs for program view", () => {
    cy.login();
    cy.visit(Paths.Repositories);
    cy.contains("a", "Programme").should("have.attr", "href", "/program");
    cy.checkFooter();
  });

  it("Shows breadcrumbs for workload view", () => {
    cy.login();
    cy.visit(buildPath(Paths.WorkloadRepositories, { workloadId: "athena" }));
    cy.contains("a", "Workloads").should("have.attr", "href", "/workload");
    cy.contains("a", "Athena").should("have.attr", "href", "/workload/athena");
    cy.checkFooter();
  });
});
