import { Paths } from "../../../../src/router/paths";
import { buildPath } from "../../../../src/utils/path";

describe("Workloads page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workloads url", () => {
    cy.visit(Paths.Workloads);
    cy.contains("Workloads");
    cy.checkFooter();
  });
});

describe("Workload page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workload url", () => {
    cy.visit(buildPath(Paths.Workloads, { workloadId: "athena" }));
    cy.contains("Athena");
    cy.checkFooter();
  });
});

describe("Workload pipeline runs page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workload pipeline runs url", () => {
    cy.visit(Paths.WorkloadPipelineRuns);
    cy.contains("Pipeline runs");
    cy.checkFooter();
  });
  it("Checks success rate on pipeline runs page", () => {
    cy.visit(
      buildPath(Paths.WorkloadPipelineRuns, {
        workloadId: "athena",
        executeImmediately: true,
        branchName: "main",
      }),
    );
    cy.contains("Pipeline runs");
    cy.contains("CI/CD pipeline");
    cy.checkFooter();
  });
});

describe("Workload pipeline health page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workload pipeline health url", () => {
    cy.visit(Paths.WorkloadPipelineHealth);
    cy.contains("Pipeline health");
    cy.checkFooter();
  });

  it("Renders pipeline health with chart data for a workload", () => {
    cy.visit(
      buildPath(Paths.WorkloadPipelineHealth, {
        workloadId: "athena",
        executeImmediately: true,
        branchName: "main",
      }),
    );

    // Page heading renders
    cy.contains("h2", "Pipeline health");
    cy.contains("Outcomes and durations of CI/CD pipelines.");

    // Breadcrumbs render with workload context
    cy.get(".v-breadcrumbs").within(() => {
      cy.contains("Workloads");
      cy.contains("athena");
      cy.contains("Pipelines");
    });

    // No error alerts should be visible
    cy.get(".v-alert").should("not.exist");

    // At least one workload outcome card with a percentage should appear
    cy.get(".pipeline-success-rate", { timeout: 15000 }).should("have.length.at.least", 1);

    // Each displayed percentage should be a valid number followed by %
    cy.get(".pipeline-success-rate").each(($el) => {
      const text = $el.text().trim();
      expect(text).to.match(/^\d{1,3}%$/, `Expected a percentage but got "${text}"`);
    });

    // At least one doughnut chart should render (ApexCharts donut)
    cy.chartVisible(true);

    // Verify chart legends contain outcome labels (e.g. 'successful')
    cy.get(".apexcharts-legend").should("have.length.at.least", 1);
    cy.get(".apexcharts-legend-text").should("have.length.at.least", 1);

    cy.checkFooter();
  });

  it("Show runs link navigates to pipeline runs with correct parameters", () => {
    cy.visit(
      buildPath(Paths.WorkloadPipelineHealth, {
        workloadId: "athena",
        executeImmediately: true,
        branchName: "main",
      }),
    );

    // Wait for outcome cards to load
    cy.get(".pipeline-success-rate", { timeout: 15000 }).should("have.length.at.least", 1);

    // Verify "Show runs" link exists and has expected query parameters
    cy.contains("a", "Show runs")
      .should("have.length.at.least", 1)
      .first()
      .invoke("attr", "href")
      .then((href) => {
        expect(href).to.include("workloadId=athena");
        expect(href).to.include("branchName=main");
        expect(href).to.include("executeImmediately=true");
        expect(href).to.include("/workload/pipeline-runs");

        cy.log(`Visiting runs at ${href}`);
        cy.visit(href);
        cy.contains("Pipeline runs");
        cy.checkFooter();
      });
  });
});

describe("Workload analysis page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workload analysis url", () => {
    cy.visit(Paths.WorkloadAnalysis);
    cy.contains("Code hotspots");
    cy.contains("Bugs vs. Coverage");
    cy.checkFooter();
  });
});

describe("Workload changes page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workload changes url", () => {
    cy.visit(buildPath(Paths.WorkloadChanges, { workloadId: "athena" }));
    cy.contains("Changes");
    cy.checkFooter();
  });
});

describe("Workload code quality page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workload code quality url", () => {
    cy.visit(buildPath(Paths.WorkloadCodeQuality, { workloadId: "athena" }));
    cy.contains("Code analysis");
    cy.checkFooter();
  });

  it("Displays code quality tiles with full titles (no ellipsis)", () => {
    cy.visit(buildPath(Paths.WorkloadCodeQuality, { workloadId: "athena" }));

    cy.contains("Code quality metric summary");

    // Click the summarise button to load tiles
    cy.contains("button", "Summarise metrics").click();

    // Wait for the tiles to load
    cy.get(".v-card-title.tile-title", { timeout: 10000 }).should("have.length.at.least", 1);

    // Check that titles are not ellipsized (overflow is visible, not hidden)
    cy.get(".v-card-title.tile-title").first().should("have.css", "overflow", "visible");
    cy.get(".v-card-title.tile-title").first().should("have.css", "white-space", "normal");
    cy.get(".v-card-title.tile-title").first().should("have.css", "text-overflow", "clip");

    cy.checkFooter();
  });
});

describe("Workload tickets page", () => {
  beforeEach(() => {
    cy.login();
  });

  it("Visits the workload tickets url", () => {
    cy.visit(buildPath(Paths.ProgramTickets, { workloadId: "athena" }));
    cy.contains("Tickets");
    cy.checkFooter();
  });
});
