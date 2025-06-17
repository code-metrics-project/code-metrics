/**
 * @group integration
 */

import { initBitbucketCloudVcs } from "../bitbucket-cloud";
import { getVcsForWorkload } from "../vcsService";
import { join } from "path";
import { loadConfig } from "../../../config/config";
import { CodeManagementTypes, TicketManagementTypes } from "../../../model/config/common";
import { mocks } from "@imposter-js/imposter";
import { initDatastore } from "../../../db/factory";
import { PullRequest, RepoChange } from "../../../model/vcs";
import { Workload, WorkloadId } from "../../../model/config/workload-config";
import { ConfigVersion } from "../../../model/config/base";

jest.setTimeout(30000);
if (process.env.MOCKS_VERBOSE === "true") mocks.verbose();
if (process.env.MOCKS_PRINT_LOG_ON_CRASH === "true") mocks.printLogOnCrash();
let mockServer;

//@ts-expect-error
const workload: Workload = {
  id: "athena",
  codeManagement: {
    type: CodeManagementTypes.BITBUCKET_CLOUD,
    serverId: "test-bitbucket",
    repoGroups: {},
    projectName: "athena-1234",
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
  initBitbucketCloudVcs();

  mockServer = await mocks.start(join(__dirname, "../../../../../mocks/bitbucket-cloud"));
  await loadConfig({
    remoteConfig: {
      version: ConfigVersion.V2_0,
      codeManagement: {
        bitbucketCloud: {
          servers: [
            {
              id: "test-bitbucket",
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

describe(`a Bitbucket VCS service`, () => {
  it(`lists all repos in an org`, async () => {
    const bitbucket = getVcsForWorkload(workload);

    const repos = await bitbucket.getReposForProject(workload.id, "athena-1234");
    expect(repos).toHaveLength(3);
    expect(repos[0]).toBe("spring-petclinic");
  });

  it(`fetches PR open time for a repo`, async () => {
    const bitbucket = getVcsForWorkload(workload);

    const pullrequests = await bitbucket.getPROpenTimeFromRepo(
      workload.id,
      "athena-1234",
      "spring-petclinic",
      new Date("2023-11-20"),
      new Date("2023-11-22"),
    );
    expect(pullrequests).toHaveLength(1);
    expect(pullrequests[0].changes).toHaveLength(2);
  });

  it(`fetches PR changes connected to an issue ID`, async () => {
    const bitbucket = getVcsForWorkload(workload);

    const pullrequests = await bitbucket.getPRsForIssuesFromRepository(workload.id, "athena-1234", "spring-petclinic", [
      "CMSP-17",
    ]);
    expect(pullrequests).toHaveLength(1);
    expect(pullrequests[0]).toEqual({
      filesChanged: [{ path: "/package.json" }],
      pr: {
        id: 4,
        repositoryName: "spring-petclinic",
        title: "feat(CMSP-17): bump version",
        vcsProjectName: "athena-1234",
        workloadId: "athena",
      },
      issueId: "CMSP-17",
    });
  });

  it(`fetches PR changes connected to a commit`, async () => {
    const bitbucket = getVcsForWorkload(workload);

    const pullrequest = await bitbucket.getPRForCommit(
      workload.id,
      "athena-1234",
      "spring-petclinic",
      "0c5b6b7c1ca531f9057e55d60915adf97eb44dc6",
    );
    expect(pullrequest).toEqual({
      id: 4,
      message: "This is the description of the PR content...",
      repositoryName: "spring-petclinic",
      sourceBranch: "feat/bump-version-3",
      title: "feat(CMSP-17): bump version",
      vcsProjectName: "athena-1234",
      workloadId: "athena",
    });
  });

  it(`generates a valid repo link`, () => {
    const bitbucket = getVcsForWorkload(workload);

    const workloadId: WorkloadId = "athena";
    const link = bitbucket.buildRepoLink(workloadId, "octo-repo");
    expect(link).toBe(`${mockServer.baseUrl()}/athena-1234/octo-repo`);
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
    expect(link).toBe(`${mockServer.baseUrl()}/athena-1234/octo-repo/commit/a1b2c3d4`);
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
    expect(link).toBe(`${mockServer.baseUrl()}/athena-1234/octo-repo/pull/5`);
  });
});
