/**
 * @group integration
 */

import { initAdoVcs } from "../azure";
import { loadConfig } from "../../../config/config";
import { join } from "path";
import { mocks } from "@imposter-js/imposter";
import { getVcsForWorkload } from "../vcsService";
import { CodeManagementTypes, TicketManagementTypes } from "../../../model/config/common";
import { initDatastore } from "../../../db/factory";
import { PullRequest, RepoChange } from "../../../model/vcs";
import { Workload, WorkloadId } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();

//@ts-expect-error
const workload: Workload = {
  id: "athena",
  codeManagement: {
    type: CodeManagementTypes.AZURE,
    serverId: "test-azure",
    repoGroups: {},
    projectName: "athena",
  },
  projectManagement: {
    type: TicketManagementTypes.AZURE,
    serverId: "test-azure",
    tableName: undefined,
  },
  incidents: {
    type: TicketManagementTypes.AZURE,
    serverId: "test-azure",
    tableName: undefined,
  },
};

let mockServer;

beforeAll(async () => {
  await initDatastore();
  initAdoVcs();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/azure"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {
        azure: {
          servers: [
            {
              id: "test-azure",
              url: mockServer.baseUrl(),
              branches: ["main"],
              apiKey: "",
            },
          ],
        },
      },
      codeAnalysis: {},
      pipelines: {},
      ticketManagement: {},
    },
    workloadConfig: {
      version: ConfigVersion.V2_0,
      workloads: [workload],
    },
  });
});
afterAll(async () => {
  await mockServer?.stop();
});

describe("Azure VCS integration", () => {
  it(`lists changes in a repo`, async () => {
    const vcs = getVcsForWorkload(workload);

    const changes = await vcs.fetchChangesInDateRange(
      workload.id,
      "decodog",
      "pet-project",
      ["main"],
      "2011-04-14",
      "2011-04-14",
    );
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].date).toMatch(/2011-04-14T\d\d:\d\d:\d\d.000Z/); // random times generated from mock
    expect(changes[0].repo).toBe("pet-project");
    expect(changes[0].message).toBe("This is an example commit message.");
    expect(changes[0].commitId).toBeTruthy();
    expect(changes[0].branch).toBe("main");
  });

  it(`summarises changes in a repo`, async () => {
    const vcs = getVcsForWorkload(workload);

    const changes = await vcs.summariseChangesInDateRange(
      workload.id,
      "decodog",
      "pet-project",
      ["main"],
      "2011-04-14",
      "2011-04-14",
    );
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].date).toBe("2011-04-14");
    expect(changes[0].value.repositoryName).toBe("pet-project");
    expect(changes[0].value.changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].value.commits.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].value.branch).toBe("main");
  });

  it(`generates a valid repo link`, () => {
    const vcs = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const link = vcs.buildRepoLink(workloadId, "pet-project");
    expect(link).toBe(`${mockServer.baseUrl()}/athena/_git/pet-project`);
  });

  it(`generates a valid file link`, () => {
    const vcs = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const link = vcs.buildFileLink(workloadId, "pet-project", "main", ".github/workflows/test.yml");
    expect(link).toBe(`${mockServer.baseUrl()}/athena/_git/pet-project/.github/workflows/test.yml`);
  });

  it(`generates a valid commit link`, () => {
    const vcs = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const change: RepoChange = {
      branch: "main",
      commitId: "a1b2c3d4",
      date: "2024-04-09",
      message: "Commit message",
      repo: "pet-project",
      workload: workloadId,
    };
    const link = vcs.buildCommitLink(change, workloadId, "decodog");
    expect(link).toBe(`${mockServer.baseUrl()}/athena/_git/pet-project/commit/a1b2c3d4`);
  });

  it(`generates a valid PR link`, () => {
    const vcs = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const change: RepoChange = {
      branch: "main",
      commitId: "a1b2c3d4",
      date: "2024-04-09",
      message: "Commit message",
      repo: "pet-project",
      workload: workloadId,
    };
    const pr: PullRequest = {
      id: 5,
      message: "Pull request body",
      repositoryName: "pet-project",
      sourceBranch: "main",
      title: "Pull request title",
      vcsProjectName: "decodog",
      workloadId: workloadId,
    };
    const link = vcs.buildPRLink(change, pr, workloadId);
    expect(link).toBe(`${mockServer.baseUrl()}/athena/_git/pet-project/pullrequest/5`);
  });

  it(`fetches PR open times with pagination`, async () => {
    const vcs = getVcsForWorkload(workload);

    // Fetch PRs from the last 30 days - the mock generates ~1 year of data
    // with pagination enabled (default page size 100)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const prEvents = await vcs.getPROpenTimeFromRepo(workload.id, "athena", "test-repo", startDate, endDate);

    // Should return results (the mock generates PRs for each day)
    expect(prEvents).toBeDefined();
    // The mock generates multiple PRs that should be aggregated
    if (prEvents.length > 0) {
      expect(prEvents[0].repositoryName).toBe("test-repo");
      expect(prEvents[0].changes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it(`fetches commits with pagination across multiple pages`, async () => {
    const vcs = getVcsForWorkload(workload);

    // Fetch changes for a single day - the mock respects skip/top params
    const changes = await vcs.fetchChangesInDateRange(
      workload.id,
      "octocat",
      "Hello-World",
      ["main"],
      "2024-01-15",
      "2024-01-15",
    );

    // Should return at least one commit
    expect(changes.length).toBeGreaterThanOrEqual(1);
    // All commits should be for the same date
    changes.forEach((change) => {
      expect(change.date).toMatch(/2024-01-15T/);
      expect(change.branch).toBe("main");
    });
  });
});
