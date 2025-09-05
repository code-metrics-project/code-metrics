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
      "octocat",
      "Hello-World",
      ["main"],
      "2011-04-14",
      "2011-04-14",
    );
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].date).toMatch(/2011-04-14T\d\d:\d\d:\d\d.000Z/); // random times generated from mock
    expect(changes[0].repo).toBe("Hello-World");
    expect(changes[0].message).toBe("This is an example commit message.");
    expect(changes[0].commitId).toBeTruthy();
    expect(changes[0].branch).toBe("main");
  });

  it(`summarises changes in a repo`, async () => {
    const vcs = getVcsForWorkload(workload);

    const changes = await vcs.summariseChangesInDateRange(
      workload.id,
      "octocat",
      "Hello-World",
      ["main"],
      "2011-04-14",
      "2011-04-14",
    );
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].date).toBe("2011-04-14");
    expect(changes[0].value.repositoryName).toBe("Hello-World");
    expect(changes[0].value.changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].value.commits.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].value.branch).toBe("main");
  });

  it(`generates a valid repo link`, () => {
    const vcs = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const link = vcs.buildRepoLink(workloadId, "octo-repo");
    expect(link).toBe(`${mockServer.baseUrl()}/athena/_git/octo-repo`);
  });

  it(`generates a valid commit link`, () => {
    const vcs = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const change: RepoChange = {
      branch: "main",
      commitId: "a1b2c3d4",
      date: "2024-04-09",
      message: "Commit message",
      repo: "octo-repo",
      workload: workloadId,
    };
    const link = vcs.buildCommitLink(change, workloadId, "octocat");
    expect(link).toBe(`${mockServer.baseUrl()}/athena/_git/octo-repo/commit/a1b2c3d4`);
  });

  it(`generates a valid PR link`, () => {
    const vcs = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const change: RepoChange = {
      branch: "main",
      commitId: "a1b2c3d4",
      date: "2024-04-09",
      message: "Commit message",
      repo: "octo-repo",
      workload: workloadId,
    };
    const pr: PullRequest = {
      id: 5,
      message: "Pull request body",
      repositoryName: "octo-repo",
      sourceBranch: "main",
      title: "Pull request title",
      vcsProjectName: "octocat",
      workloadId: workloadId,
    };
    const link = vcs.buildPRLink(change, pr, workloadId);
    expect(link).toBe(`${mockServer.baseUrl()}/athena/_git/octo-repo/pullrequest/5`);
  });
});
