import { Paths } from "../../../../src/router/paths";

describe("Programme Quality Gates page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the programme quality gates url", () => {
    cy.visit(Paths.ProgramQualityGates);
    cy.contains("Quality Gates");
    cy.contains("Quality Gates are automated checks ensuring code meets quality standards");
    cy.checkFooter();
  });

  it("Displays quality gate cards with repository groups", () => {
    cy.visit(Paths.ProgramQualityGates);
    
    // Check that quality gate cards are displayed
    cy.contains("athena / backend").should("be.visible");
    cy.contains("athena / frontend").should("be.visible");
    cy.contains("gaia / backend").should("be.visible");
  });

  it("Shows headline metrics on quality gate cards", () => {
    cy.visit(Paths.ProgramQualityGates);

    // Check that cards show number of repos
    cy.contains("athena / backend")
      .parent()
      .parent()
      .parent()
      .within(() => {
        cy.contains("Number of repos:");
      });
  });

  it("Expands and collapses quality gate card details", () => {
    cy.visit(Paths.ProgramQualityGates);
    
    // Find the first Details button and click it
    cy.contains("button", "Details").first().click();
    
    // The button should now be in active state (we can verify by checking it's still visible)
    cy.contains("button", "Details").first().should("be.visible");
    
    // Click again to collapse
    cy.contains("button", "Details").first().click();
  });
});

describe("Workload Quality Gates page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workload quality gates url", () => {
    cy.visit("/workload/athena/quality-gates");
    cy.contains("Quality Gates");
    cy.contains("Quality Gates are automated checks ensuring code meets quality standards");
    cy.checkFooter();
  });

  it("Displays quality gate cards for specific workload", () => {
    cy.visit("/workload/athena/quality-gates");
    
    // Check that quality gate cards for athena workload are displayed
    cy.contains("athena / backend").should("be.visible");
    cy.contains("athena / frontend").should("be.visible");
    cy.contains("athena / platform").should("be.visible");
    
    // Check that other workload cards are NOT displayed
    cy.contains("gaia / backend").should("not.exist");
    cy.contains("icarus / backend").should("not.exist");
  });

  it("Shows correct breadcrumb navigation", () => {
    cy.visit("/workload/athena/quality-gates");
    
    // Check breadcrumbs
    cy.contains("a", "Workloads").should("have.attr", "href", "/workload");
    cy.contains("a", "Athena").should("have.attr", "href", "/workload/athena");
  });

  it("Displays headline metrics for workload quality gates", () => {
    cy.visit("/workload/athena/quality-gates");

    // Check that cards show metrics
    cy.contains("athena / backend")
      .parent()
      .parent()
      .parent()
      .within(() => {
        cy.contains("Number of repos:");
      });

    cy.contains("athena / platform")
      .parent()
      .parent()
      .parent()
      .within(() => {
        cy.contains("Number of repos:");
      });
  });

  it("Expands quality gate card to show repository details", () => {
    cy.visit("/workload/athena/quality-gates");
    
    // Find and click the Details button for athena/backend
    cy.contains("athena / backend")
      .parent()
      .parent()
      .parent()
      .within(() => {
        cy.contains("button", "Details").click();
      });
    
    // Verify the button is still visible after expansion
    cy.contains("athena / backend")
      .parent()
      .parent()
      .parent()
      .within(() => {
        cy.contains("button", "Details").should("be.visible");
      });
  });

  it("Navigates to different workload quality gates", () => {
    // Visit first workload
    cy.visit("/workload/athena/quality-gates");
    cy.contains("athena / backend").should("be.visible");
    
    // Visit second workload
    cy.visit("/workload/gaia/quality-gates");
    cy.contains("gaia / backend").should("be.visible");
    cy.contains("gaia / frontend").should("be.visible");
    
    // Athena cards should not be visible
    cy.contains("athena / backend").should("not.exist");
  });
});
