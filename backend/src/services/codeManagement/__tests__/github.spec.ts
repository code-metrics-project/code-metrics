/**
 * @group integration
 */

import { initGithubVcs } from "../github";
import { getVcsForWorkload } from "../vcsService";
import { join } from "path";
import { loadConfig } from "../../../config/config";
import { CodeManagementTypes, TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { initDatastore } from "../../../db/factory";
import { PullRequest, RepoChange } from "../../../model/vcs";
import {
  Workload,
  WorkloadCodeAnalysisConfig,
  WorkloadId,
  WorkloadPipelinesConfig,
} from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";
import { AuthMethod } from "../../../model/config/remote-config";
import { LogLevel, overrideLogLevel } from "../../../utils/logger/logger";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();
let mockServer;

const workload: Workload = {
  id: "gaia",
  codeManagement: {
    type: CodeManagementTypes.GITHUB,
    serverId: "test-github",
    projectName: "Octocat",
    repoGroups: {
      backend: {
        components: [{ repo: "/octocat.*/", name: "octo-backend" }],
      },
      frontend: {
        sonarTags: ["fe"],
      },
      platform: {
        components: [
          { repo: "/.*_platform/", name: "octo-platform" },
          { repo: "/.*_infrastructure/", name: "octo-infra" },
        ],
      },
    },
  },
  projectManagement: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
  incidents: {
    type: TicketManagementTypes.JIRA,
    serverId: "test-jira",
    tableName: undefined,
  },
  codeAnalysis: {} as WorkloadCodeAnalysisConfig,
  pipelines: {} as WorkloadPipelinesConfig,
};

beforeAll(async () => {
  overrideLogLevel(LogLevel.Verbose);

  await initDatastore();
  initGithubVcs();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/github"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {
        github: {
          servers: [
            {
              id: "test-github",
              url: mockServer.baseUrl(),
              branches: ["main"],
              authMethod: AuthMethod.GITHUB_APP,
              githubApp: {
                appId: "test-app-id",
                privateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest-key\n-----END RSA PRIVATE KEY-----",
                installationId: "12345",
              },
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

describe(`GitHub VCS integration`, () => {
  it(`lists all repos in an org`, async () => {
    const github = getVcsForWorkload(workload);

    const repos = await github.getReposForProject(workload.id, workload.codeManagement.projectName);
    expect(repos).toHaveLength(1);
    expect(repos[0]).toBe("octo-repo");
  });

  it(`gets all prs matching issueId for a given repo in an org`, async () => {
    const github = getVcsForWorkload(workload);

    const prs = await github.getPRsForIssuesFromRepository(workload.id, "octocat", "octo-repo", ["DEV-12345"]);
    expect(prs).toHaveLength(1);
    expect(prs[0].pr.title).toBe("DEV-12345 - Amazing new feature");
    expect(prs[0].filesChanged).toHaveLength(1);
  });

  it(`lists changes in a repo`, async () => {
    const github = getVcsForWorkload(workload);

    const changes = await github.fetchChangesInDateRange(
      workload.id,
      "octocat",
      "octo-repo",
      ["main"],
      "2011-04-14",
      "2011-04-14",
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].date).toBe("2011-04-14T16:00:49Z");
    expect(changes[0].repo).toBe("octo-repo");
    expect(changes[0].message).toBe("Fix all the bugs");
    expect(changes[0].commitId).toBe("6dcb09b5b57875f334f61aebed695e2e4193db5e");
    expect(changes[0].branch).toBe("main");
  });

  it(`summarises changes in a repo`, async () => {
    const github = getVcsForWorkload(workload);

    const changes = await github.summariseChangesInDateRange(
      workload.id,
      "octocat",
      "octo-repo",
      ["main"],
      "2011-04-14",
      "2011-04-14",
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].date).toBe("2011-04-14");
    expect(changes[0].value.repositoryName).toBe("octo-repo");
    expect(changes[0].value.changes).toHaveLength(1);
    expect(changes[0].value.changes[0].added).toBe(104);
    expect(changes[0].value.commits).toHaveLength(1);
    expect(changes[0].value.commits[0]).toBe("6dcb09b5b57875f334f61aebed695e2e4193db5e");
    expect(changes[0].value.branch).toBe("main");
  });

  it(`generates a valid repo link`, () => {
    const github = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "gaia";
    const link = github.buildRepoLink(workloadId, "octo-repo");
    expect(link).toBe(`${mockServer.baseUrl()}/Octocat/octo-repo`);
  });

  it(`generates a valid commit link`, () => {
    const github = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "gaia";
    const change: RepoChange = {
      branch: "main",
      commitId: "a1b2c3d4",
      date: "2024-04-09",
      message: "Commit message",
      repo: "octo-repo",
      workload: workloadId,
    };
    const link = github.buildCommitLink(change, workloadId, "octocat");
    expect(link).toBe(`${mockServer.baseUrl()}/Octocat/octo-repo/commit/a1b2c3d4`);
  });

  it(`generates a valid PR link`, () => {
    const github = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "gaia";
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
    const link = github.buildPRLink(change, pr, workloadId);
    expect(link).toBe(`${mockServer.baseUrl()}/Octocat/octo-repo/pull/5`);
  });

  it("should get the PR associated with a commit", async () => {
    const github = getVcsForWorkload(workload);

    const pr = await github.getPRForCommit(workload.id, "octo-org", "octo-repo", "a1b2c3d4");
    expect(pr.id).toBe(1347);
    expect(pr.title).toBe("Amazing new feature");
  });

  it("should get the earliest commit for a PR", async () => {
    const github = getVcsForWorkload(workload);

    const commit = await github.getEarliestCommitForPr(workload.id, "octo-org", "octo-repo", 1347);
    expect(commit.commitId).toBe("6dcb09b5b57875f334f61aebed695e2e4193db5e");
    expect(commit.date).toBe("2011-04-14T16:00:49Z");
    expect(commit.message).toBe("Fix all the bugs");
  });
});
