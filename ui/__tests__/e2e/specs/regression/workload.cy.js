import { Paths } from "../../../../src/router/paths";
import { buildPath } from "../../../../src/utils/path";

describe("Workloads page", () => {
  it("Visits the workloads url", () => {
    cy.login();
    cy.visit(Paths.Workloads);
    cy.contains("Workloads");
    cy.checkFooter();
  });
});

describe("Workload page", () => {
  it("Visits the workload url", () => {
    cy.login();
    cy.visit(buildPath(Paths.Workloads, { workloadId: "athena" }));
    cy.contains("Athena");
    cy.checkFooter();
  });
});

describe("Workload pipeline runs page", () => {
  it("Visits the workload pipeline runs url", () => {
    cy.login();
    cy.visit(Paths.WorkloadPipelineRuns);
    cy.contains("Pipeline runs");
    cy.checkFooter();
  });
  it("Checks success rate on pipeline runs page", () => {
    cy.login();
    cy.visit(
      buildPath(Paths.WorkloadPipelineRuns, {
        workloadId: "gaia",
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
  it("Visits the workload pipeline health url", () => {
    cy.login();
    cy.visit(Paths.WorkloadPipelineHealth);
    cy.contains("Pipeline health");
    cy.checkFooter();
  });

  it("Checks success rate on pipeline health page", () => {
    cy.login();
    cy.visit(
      buildPath(Paths.WorkloadPipelineHealth, {
        workloadId: "gaia",
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
  it("Visits the workload analysis url", () => {
    cy.login();
    cy.visit(Paths.WorkloadAnalysis);
    cy.contains("Bug culprit files");
    cy.contains("Bugs vs. Coverage");
    cy.checkFooter();
  });
});

describe("Workload changes page", () => {
  it("Visits the workload changes url", () => {
    cy.login();
    cy.visit(buildPath(Paths.WorkloadChanges, { workloadId: "athena" }));
    cy.contains("Changes");
    cy.checkFooter();
  });
});

describe("Workload code quality page", () => {
  it("Visits the workload code quality url", () => {
    cy.login();
    cy.visit(buildPath(Paths.WorkloadCodeQuality, { workloadId: "athena" }));
    cy.contains("Code analysis");
    cy.checkFooter();
  });
});

describe("Workload tickets page", () => {
  it("Visits the workload tickets url", () => {
    cy.login();
    cy.visit(buildPath(Paths.ProgramTickets, { workloadId: "athena" }));
    cy.contains("Tickets");
    cy.checkFooter();
  });
});
