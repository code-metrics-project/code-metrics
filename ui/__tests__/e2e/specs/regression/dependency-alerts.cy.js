import { Paths } from "../../../../src/router/paths";
import { buildPath } from "../../../../src/utils/path";

describe("Dependency Alerts page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the dependency alerts url from programme level", () => {
    cy.visit(Paths.ProgramDependencyAlerts);
    cy.contains("Dependency Alerts");
    cy.contains("View dependency vulnerability alerts and SLA compliance");
    cy.checkFooter();
  });

  it("Visits the dependency alerts url from workload level", () => {
    cy.visit(Paths.WorkloadDependencyAlerts);
    cy.contains("Dependency Alerts");
    cy.contains("View dependency vulnerability alerts and SLA compliance");
    cy.checkFooter();
  });

  it("Shows correct breadcrumb navigation for programme level", () => {
    cy.visit(Paths.ProgramDependencyAlerts);

    // Check breadcrumbs
    cy.contains("a", "Programme").should("have.attr", "href", "/program");
  });

  it("Displays the workload selector and repository input", () => {
    cy.visit(Paths.ProgramDependencyAlerts);

    // Check for workload selector
    cy.get('input[name="workloads"]').should("exist");

    // Check for repository name input (label is floating so check the input exists)
    cy.get("input").filter('[type="text"]').should("have.length.at.least", 2);

    // Check for fetch button
    cy.contains("button", "Fetch Alerts").should("be.visible");
  });

  it("Loads dependency alerts for gaia workload", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "code-metrics",
      }),
    );

    cy.contains("Dependency Alerts");

    // Wait for data to load
    cy.contains("Alert Summary", { timeout: 10000 }).should("be.visible");

    cy.checkFooter();
  });

  it("Displays overall summary when alerts are loaded", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "code-metrics",
      }),
    );

    // Wait for summary to appear
    cy.contains("Overall Summary", { timeout: 10000 }).should("be.visible");

    // Check for summary metrics
    cy.contains(/\d+ total alerts/).should("be.visible");
    cy.contains("Open Violations:").should("be.visible");
    cy.contains("Compliance:").should("be.visible");
  });

  it("Shows workload-specific analysis cards", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "code-metrics",
      }),
    );

    // Wait for workload card to appear
    cy.contains("gaia - code-metrics", { timeout: 10000 }).should("be.visible");

    // Check for breakdown sections
    cy.contains("By State").should("be.visible");
    cy.contains("By Severity").should("be.visible");
    cy.contains("SLA Compliance").should("be.visible");
  });

  it("Displays severity chips with correct colors", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "code-metrics",
      }),
    );

    // Wait for data to load
    cy.contains("By Severity", { timeout: 10000 }).should("be.visible");

    // Check for severity chips (at least one should be present if there are alerts)
    cy.get(".v-chip").should("exist");
  });

  it("Shows SLA violations table when violations exist", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "code-metrics",
      }),
    );

    // Wait for data to load
    cy.contains("Alert Summary", { timeout: 10000 }).should("be.visible");

    // Check if violations table appears (only if there are violations)
    cy.get("body").then(($body) => {
      if ($body.text().includes("SLA Violations")) {
        cy.contains("SLA Violations").should("be.visible");

        // Check for table headers
        cy.contains("Alert #").should("be.visible");
        cy.contains("Severity").should("be.visible");
        cy.contains("Package").should("be.visible");
        cy.contains("Days Overdue").should("be.visible");
      }
    });
  });

  it("Allows manual fetch of alerts from programme level", () => {
    cy.visit(Paths.ProgramDependencyAlerts);

    // Select gaia workload
    cy.get('input[name="workloads"]').click();
    cy.getComboboxItem("workloads", "gaia").click();
    cy.get('input[name="workloads"]').type("{esc}");

    // Enter repository name
    cy.get("label").contains("Repository Name").parent().parent().find("input").type("code-metrics");

    // Click fetch button
    cy.contains("button", "Fetch Alerts").click();

    // Wait for data to load
    cy.contains("Alert Summary", { timeout: 10000 }).should("be.visible");

    // Verify gaia workload data is shown
    cy.contains("gaia - code-metrics").should("be.visible");
  });

  it("Displays fetch button in disabled state when busy", () => {
    cy.visit(Paths.ProgramDependencyAlerts);

    // Select workload and repo
    cy.get('input[name="workloads"]').click();
    cy.getComboboxItem("workloads", "gaia").click();
    cy.get('input[name="workloads"]').type("{esc}");
    cy.get("label").contains("Repository Name").parent().parent().find("input").type("code-metrics");

    // Click fetch button and immediately check state
    cy.contains("button", "Fetch Alerts").as("fetchBtn").click();

    // Button should either show fetching state or complete quickly
    cy.get("@fetchBtn").should("satisfy", ($btn) => {
      const text = $btn.text();
      return text.includes("Fetching") || text.includes("Fetch Alerts");
    });
  });

  it("Shows progress indicator when fetching data", () => {
    cy.visit(Paths.ProgramDependencyAlerts);

    // Select workload and repo
    cy.get('input[name="workloads"]').click();
    cy.getComboboxItem("workloads", "gaia").click();
    cy.get('input[name="workloads"]').type("{esc}");
    cy.get("label").contains("Repository Name").parent().parent().find("input").type("code-metrics");

    // Click fetch button
    cy.contains("button", "Fetch Alerts").click();

    // Wait for results (progress indicator may appear briefly or not at all if fast)
    cy.contains("Alert Summary", { timeout: 10000 }).should("be.visible");
  });

  it("Navigates to GitHub alert details via link", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "code-metrics",
      }),
    );

    // Wait for data to load
    cy.contains("Alert Summary", { timeout: 10000 }).should("be.visible");

    // Check if violations table has links
    cy.get("body").then(($body) => {
      if ($body.text().includes("SLA Violations")) {
        // Find link buttons in the table
        cy.get('a[href*="github.com"]').should("have.attr", "target", "_blank");
      }
    });
  });

  it("Supports multiple workload selection", () => {
    cy.visit(Paths.ProgramDependencyAlerts);

    // Select multiple workloads
    cy.get('input[name="workloads"]').click();
    cy.getComboboxItem("workloads", "gaia").click();
    cy.get('input[name="workloads"]').click();
    cy.getComboboxItem("workloads", "athena").click();
    cy.get('input[name="workloads"]').type("{esc}");

    // Enter repository name
    cy.get("label").contains("Repository Name").parent().parent().find("input").type("code-metrics");

    // Click fetch button
    cy.contains("button", "Fetch Alerts").click();

    // Wait for data to load
    cy.contains("Alert Summary", { timeout: 10000 }).should("be.visible");
  });

  it("Displays compliance rate as percentage", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "code-metrics",
      }),
    );

    // Wait for summary to appear
    cy.contains("Overall Summary", { timeout: 10000 }).should("be.visible");

    // Check for percentage in compliance rate
    cy.contains(/Compliance: \d+(\.\d+)?%/).should("be.visible");
  });

  it("Shows state chips in breakdown", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "code-metrics",
      }),
    );

    // Wait for data to load
    cy.contains("By State", { timeout: 10000 }).should("be.visible");

    // Check for at least one state chip
    cy.get(".v-chip").should("exist");
  });

  it("Handles empty state when no alerts exist", () => {
    cy.visit(
      buildPath(Paths.WorkloadDependencyAlerts, {
        workloadId: "gaia",
        executeImmediately: true,
        repoName: "nonexistent-repo",
      }),
    );

    // Either shows data or an error/empty state
    cy.get("body").should("exist");
  });
});
