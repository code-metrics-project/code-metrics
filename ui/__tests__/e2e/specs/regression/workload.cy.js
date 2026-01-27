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

  it("Checks success rate on pipeline health page", () => {
    cy.visit(
      buildPath(Paths.WorkloadPipelineHealth, {
        workloadId: "athena",
        executeImmediately: true,
        branchName: "main",
      }),
    );
    cy.contains("Pipeline health");
    cy.contains("100%");
    cy.checkFooter();

    cy.contains("a", "Show runs")
      .invoke("attr", "href")
      .then((href) => {
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
