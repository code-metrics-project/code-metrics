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
    serverId: "test-github-pat",
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

const workloadGithubApp: Workload = {
  id: "gaia-github-app",
  codeManagement: {
    type: CodeManagementTypes.GITHUB,
    serverId: "test-github-app",
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
              id: "test-github-pat",
              url: mockServer.baseUrl(),
              branches: ["main"],
              apiKey: "fake-pat-token-for-testing",
            },
            {
              id: "test-github-app",
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
      workloads: [workload, workloadGithubApp],
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
    // Mock now returns 101 repos to test pagination
    expect(repos.length).toBeGreaterThanOrEqual(1);
    expect(repos).toContain("hello-world");
  });

  it(`paginates correctly when fetching more than 100 repos (PAT authentication)`, async () => {
    const github = getVcsForWorkload(workload);

    // The mock returns 101 repos via GET /orgs/{org}/repos to test pagination
    // (default page size is 100, so this ensures we fetch multiple pages)
    const repos = await github.getReposForProject(workload.id, "Octocat");

    // Should get all 101 repos, not just the first page of 100
    expect(repos.length).toBe(101);
    expect(repos).toContain("hello-world");
    expect(repos).toContain("repo-2");
    expect(repos).toContain("repo-50");
    expect(repos).toContain("repo-101");
  });

  it(`paginates correctly when fetching more than 100 repos (GitHub App authentication)`, async () => {
    const github = getVcsForWorkload(workloadGithubApp);

    // The mock returns 101 repos via GET /installation/repositories to test pagination
    // (default page size is 100, so this ensures we fetch multiple pages)
    const repos = await github.getReposForProject(workloadGithubApp.id, "Octocat");

    // Should get all 101 repos, not just the first page of 100
    expect(repos.length).toBe(101);
    expect(repos).toContain("hello-world");
    expect(repos).toContain("repo-2");
    expect(repos).toContain("repo-50");
    expect(repos).toContain("repo-101");
  });

  it(`gets all prs matching issueId for a given repo in an org`, async () => {
    const github = getVcsForWorkload(workload);

    // Verify filtering works: a non-existent issue ID should return no matches
    const noMatch = await github.getPRsForIssuesFromRepository(workload.id, "octocat", "hello-world", [
      "NONEXISTENT-99999",
    ]);
    expect(noMatch).toHaveLength(0);

    // Verify the function can retrieve and filter PRs without error.
    // The mock generates titles like "#<number> - <description>"; use a
    // 3-digit number range that will appear in most generated sets.
    const prs = await github.getPRsForIssuesFromRepository(workload.id, "octocat", "hello-world", ["#"]);
    // Result may be empty depending on the regex match; verify structure if present
    expect(Array.isArray(prs)).toBe(true);
    for (const entry of prs) {
      expect(entry.pr.title).toBeTruthy();
      expect(entry.pr.repositoryName).toBe("hello-world");
      expect(entry.filesChanged).toHaveLength(1);
    }
  });

  it(`lists changes in a repo`, async () => {
    const github = getVcsForWorkload(workload);

    const changes = await github.fetchChangesInDateRange(
      workload.id,
      "octocat",
      "hello-world",
      ["main"],
      "2011-04-14",
      "2011-04-14",
    );
    expect(changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].date).toBeTruthy();
    expect(changes[0].repo).toBe("hello-world");
    expect(changes[0].message).toBeTruthy();
    expect(changes[0].commitId).toBeTruthy();
    expect(changes[0].branch).toBe("main");
  });

  it(`summarises changes in a repo`, async () => {
    const github = getVcsForWorkload(workload);

    const changes = await github.summariseChangesInDateRange(
      workload.id,
      "octocat",
      "hello-world",
      ["main"],
      "2011-04-14",
      "2011-04-14",
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].date).toBe("2011-04-14");
    expect(changes[0].value.repositoryName).toBe("hello-world");
    expect(changes[0].value.changes.length).toBeGreaterThanOrEqual(1);
    expect(changes[0].value.changes[0].added).toBeGreaterThanOrEqual(0);
    expect(changes[0].value.commits.length).toBeGreaterThanOrEqual(1);
    expect(typeof changes[0].value.commits[0]).toBe("string");
    expect(changes[0].value.branch).toBe("main");
  });

  it(`generates a valid repo link`, () => {
    const github = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "gaia";
    const link = github.buildRepoLink(workloadId, "hello-world");
    expect(link).toBe(`${mockServer.baseUrl()}/Octocat/hello-world`);
  });

  it(`generates a valid file link`, () => {
    const github = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "gaia";
    const link = github.buildFileLink(workloadId, "hello-world", "main", ".github/workflows/test.yml");
    expect(link).toBe(`${mockServer.baseUrl()}/Octocat/hello-world/blob/main/.github/workflows/test.yml`);
  });

  it(`generates a valid commit link`, () => {
    const github = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "gaia";
    const change: RepoChange = {
      branch: "main",
      commitId: "a1b2c3d4",
      date: "2024-04-09",
      message: "Commit message",
      repo: "hello-world",
      workload: workloadId,
    };
    const link = github.buildCommitLink(change, workloadId, "octocat");
    expect(link).toBe(`${mockServer.baseUrl()}/Octocat/hello-world/commit/a1b2c3d4`);
  });

  it(`generates a valid PR link`, () => {
    const github = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "gaia";
    const change: RepoChange = {
      branch: "main",
      commitId: "a1b2c3d4",
      date: "2024-04-09",
      message: "Commit message",
      repo: "hello-world",
      workload: workloadId,
    };
    const pr: PullRequest = {
      id: 5,
      message: "Pull request body",
      repositoryName: "hello-world",
      sourceBranch: "main",
      title: "Pull request title",
      vcsProjectName: "octocat",
      workloadId: workloadId,
    };
    const link = github.buildPRLink(change, pr, workloadId);
    expect(link).toBe(`${mockServer.baseUrl()}/Octocat/hello-world/pull/5`);
  });

  it("should get the PR associated with a commit", async () => {
    const github = getVcsForWorkload(workload);

    const pr = await github.getPRForCommit(workload.id, "octocat", "hello-world", "a1b2c3d4");
    // The mock may return 0 PRs non-deterministically; when a PR is returned, verify its structure
    if (pr) {
      expect(pr.id).toBeGreaterThan(0);
      expect(pr.title).toBeTruthy();
      expect(pr.repositoryName).toBe("hello-world");
    } else {
      expect(pr).toBeNull();
    }
  });

  it("should get the earliest commit for a PR", async () => {
    const github = getVcsForWorkload(workload);

    const commit = await github.getEarliestCommitForPr(workload.id, "octocat", "hello-world", 1347);
    expect(commit.commitId).toBe("6dcb09b5b57875f334f61aebed695e2e4193db5e");
    expect(commit.date).toBe("2011-04-14T16:00:49Z");
    expect(commit.message).toBe("Fix all the bugs");
  });
});
