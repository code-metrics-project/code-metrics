/**
 * @group integration
 */

import { initBitbucketServerVcs, testables } from "../bitbucket-server";
import { getVcsForWorkload } from "../vcsService";
import { join } from "path";
import { loadConfig } from "../../../config/config";
import { CodeManagementTypes, TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { initDatastore } from "../../../db/factory";
import { PullRequest, RepoChange } from "../../../model/vcs";
import { Workload, WorkloadId } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";
import {createBitbuckerServerConnection} from "../../../utils/bitbucketServerConnection";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();
let mockServer;

//@ts-expect-error
const workload: Workload = {
  id: "athena",
  codeManagement: {
    type: CodeManagementTypes.BITBUCKET_SERVER,
    serverId: "mock-bitbucket-server",
    repoGroups: {},
    projectName: "ALL",
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
};

beforeAll(async () => {
  await initDatastore();
  initBitbucketServerVcs();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/bitbucket-server"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {
        bitbucketServer: {
          servers: [
            {
              id: "mock-bitbucket-server",
              url: mockServer.baseUrl(),
              branches: ["main"],
              apiKey: "password",
              username: "username",
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

describe(`a Bitbucket Server VCS service`, () => {
  it(`lists all repos in an org`, async () => {
    const bitbucket = getVcsForWorkload(workload);

    const repos = await bitbucket.getReposForProject(workload.id, "spring-petclinic");
    expect(repos).toHaveLength(1);
    expect(repos[0]).toBe("spring-petclinic");
  });

  it(`fetches PR open time for a repo`, async () => {
    const bitbucket = getVcsForWorkload(workload);

    const pullrequests = await bitbucket.getPROpenTimeFromRepo(
      workload.id,
      "ALL",
      "spring-petclinic",
      new Date("2024-04-02"),
      new Date("2024-04-04"),
    );
    expect(pullrequests).toHaveLength(1);
    expect(pullrequests[0].changes).toHaveLength(1);
  });

  it(`fetches PR changes connected to an issue ID`, async () => {
    const bitbucket = getVcsForWorkload(workload);

    const pullrequests = await bitbucket.getPRsForIssuesFromRepository(workload.id, "ALL", "spring-petclinic", [
      "CMSP-17",
    ]);
    expect(pullrequests).toHaveLength(1);
    expect(pullrequests[0]).toEqual({
      filesChanged: [{ path: "/package.json" }],
      pr: {
        id: 1,
        repositoryName: "spring-petclinic",
        title: "feat(CMSP-17): bump version",
        vcsProjectName: "ALL",
        workloadId: "athena",
      },
      issueId: "CMSP-17",
    });
  });

  it(`fetches PR changes connected to a commit`, async () => {
    const bitbucket = getVcsForWorkload(workload);

    const pullrequest = await bitbucket.getPRForCommit(
      workload.id,
      "ALL",
      "spring-petclinic",
      "579fd39f9c44df82c0cfdc5b101089a6e4535d5b",
    );
    expect(pullrequest).toEqual({
      id: 1,
      message: "This is the description of the PR content...",
      repositoryName: "spring-petclinic",
      sourceBranch: "refs/heads/feat/init-project",
      title: "feat(CMSP-17): bump version",
      vcsProjectName: "ALL",
      workloadId: "athena",
    });
  });

  it(`generates a valid repo link`, () => {
    const bitbucket = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const link = bitbucket.buildRepoLink(workloadId, "octo-repo");
    expect(link).toBe(`${mockServer.baseUrl()}/ALL/octo-repo`);
  });

  it(`generates a valid commit link`, () => {
    const bitbucket = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const change: RepoChange = {
      branch: "main",
      commitId: "a1b2c3d4",
      date: "2024-04-09",
      message: "Commit message",
      repo: "octo-repo",
      workload: workloadId,
    };
    const link = bitbucket.buildCommitLink(change, workloadId, "octocat");
    expect(link).toBe(`${mockServer.baseUrl()}/ALL/octo-repo/commit/a1b2c3d4`);
  });

  it(`generates a valid PR link`, () => {
    const bitbucket = getVcsForWorkload(workload);

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
    const link = bitbucket.buildPRLink(change, pr, workloadId);
    expect(link).toBe(`${mockServer.baseUrl()}/ALL/octo-repo/pull/5`);
  });

  it(`correctly diffs a PR`, () => {
    const expected = {"path": "/package.json"}
    const rawdiff = `diff --git src://package.json dst://package.json
new file mode 100644
index 0000000..e3bea32
--- src://package.json
+++ dst://package.json
@@ -0,0 +1,15 @@
+{
+  "name": "spring-petclinic",
+  "version": "0.0.1",
+  "description": "",
+  "main": "index.js",
+  "scripts": {
+    "test": "echo \\"Error: no test specified\\" && exit 1"
+  },
+  "repository": {
+    "type": "git",
+    "url": "http://localhost:7990/scm/all/spring-petclinic.git"
+  },
+  "author": "Nick Heal",
+  "license": "ISC"
+}
    `

    const res = testables.normalisePullRequestFileList(rawdiff, "1")

    expect(res[0]).toEqual(expected)

  });
  it(`correctly diffs a PR - rename `, () => {
    const expected = {"path": "/abc/Application_v243_before.json"}
    const rawdiff = `diff --git src://abc/Application_v242_before.json dst://abc/Application_v243_before.json
similarity index 100%
rename from abc/Application_v242_before.json
rename to abc/Application_v243_before.json
    `

    const res = testables.normalisePullRequestFileList(rawdiff, "2")
    expect(res[0]).toEqual(expected)
  });
});
