import { discoverLinks } from "../commits";
import { VcsService } from "../../services/codeManagement/vcsService";
import { IssueMgmtService } from "../../services/projectManangement/issueMgmtService";
import { PullRequest, RepoChange } from "../../model/vcs";
import { loadConfig } from "../../config/config";
import path from "path";
import { LightweightIssue } from "../../model/tickets";

beforeAll(async () => {
  await loadConfig({ dir: path.join(__dirname, "test-data/defaults") });
});

describe("discoverLinks", () => {
  it("generates links for a change without a PR and without an issue", async () => {
    const vcs: VcsService = {
      /**
       * No PR for this change.
       */
      getPRForCommit: jest.fn().mockReturnValue(Promise.resolve(null)),
      buildCommitLink: jest.fn().mockReturnValue("https://github.com/athena/octocat/commit/abc123"),
      buildPRLink: jest.fn().mockReturnValue(null),
      getReposForProject: jest.fn().mockReturnValue(null),
      getPROpenTimeFromRepo: jest.fn().mockReturnValue(null),
      getPRSizeFromRepo: jest.fn().mockReturnValue(null),
      getPRsForIssuesFromRepository: jest.fn().mockReturnValue(null),
      fetchChangesInDateRange: jest.fn().mockReturnValue(null),
      summariseChangesInDateRange: jest.fn().mockReturnValue(null),
      buildRepoLink: jest.fn().mockReturnValue(null),
      getEarliestCommitForPr: jest.fn().mockReturnValue(null),
    };
    const issueMgmt: IssueMgmtService = {
      /**
       * No issue for this change.
       */
      matchTicketByIdAndRetrieve: jest.fn().mockReturnValue(Promise.resolve(null)),
      getTicket: jest.fn().mockReturnValue(null),
      getAllTicketIds: jest.fn().mockReturnValue(null),
      fetchTickets: jest.fn().mockReturnValue(null),
      fetchOpenTickets: jest.fn().mockReturnValue(null),
      matchTicketId: jest.fn().mockReturnValue(null),
      buildTicketLink: jest.fn().mockReturnValue(null),
    };
    const change: RepoChange = {
      branch: "",
      commitId: "abc123",
      date: "",
      message: "",
      repo: "octocat",
      workload: "",
    };
    const links = await discoverLinks("athena", "athena", vcs, issueMgmt, change);
    expect(links.commitLink).toBe("https://github.com/athena/octocat/commit/abc123");
    expect(links.prTitle).toBeUndefined();
    expect(links.prLink).toBeUndefined();
    expect(links.issueId).toBeUndefined();
    expect(links.issueType).toBeUndefined();
    expect(links.issueTitle).toBeUndefined();
    expect(links.issueLink).toBeUndefined();
  });

  it("generates links for a change with a PR but without an issue", async () => {
    const vcs: VcsService = {
      /**
       * PR for this change.
       */
      getPRForCommit: jest.fn().mockReturnValue(
        Promise.resolve(<PullRequest>{
          id: 100,
          title: "[ABC-123] feat: adds new widget",
          workloadId: "athena",
          vcsProjectName: "athena",
          repositoryName: "octocat",
        }),
      ),
      buildCommitLink: jest.fn().mockReturnValue("https://github.com/athena/octocat/commit/abc123"),
      buildPRLink: jest.fn().mockReturnValue("https://github.com/athena/octocat/pull/100"),
      getReposForProject: jest.fn().mockReturnValue(null),
      getPROpenTimeFromRepo: jest.fn().mockReturnValue(null),
      getPRSizeFromRepo: jest.fn().mockReturnValue(null),
      getPRsForIssuesFromRepository: jest.fn().mockReturnValue(null),
      fetchChangesInDateRange: jest.fn().mockReturnValue(null),
      summariseChangesInDateRange: jest.fn().mockReturnValue(null),
      buildRepoLink: jest.fn().mockReturnValue(null),
      getEarliestCommitForPr: jest.fn().mockReturnValue(null),
    };
    const issueMgmt: IssueMgmtService = {
      /**
       * No issue for this change.
       */
      matchTicketByIdAndRetrieve: jest.fn().mockReturnValue(Promise.resolve(null)),
      getTicket: jest.fn().mockReturnValue(null),
      getAllTicketIds: jest.fn().mockReturnValue(null),
      fetchTickets: jest.fn().mockReturnValue(null),
      fetchOpenTickets: jest.fn().mockReturnValue(null),
      matchTicketId: jest.fn().mockReturnValue(null),
      buildTicketLink: jest.fn().mockReturnValue(null),
    };
    const change: RepoChange = {
      branch: "",
      commitId: "abc123",
      date: "",
      message: "",
      repo: "octocat",
      workload: "",
    };
    const links = await discoverLinks("athena", "athena", vcs, issueMgmt, change);
    expect(links.commitLink).toBe("https://github.com/athena/octocat/commit/abc123");
    expect(links.prTitle).toBe("[ABC-123] feat: adds new widget");
    expect(links.prLink).toBe("https://github.com/athena/octocat/pull/100");
    expect(links.issueId).toBeUndefined();
    expect(links.issueType).toBeUndefined();
    expect(links.issueTitle).toBeUndefined();
    expect(links.issueLink).toBeUndefined();
  });

  it("generates links for a change with both a PR and an issue", async () => {
    const vcs: VcsService = {
      /**
       * PR for this change.
       */
      getPRForCommit: jest.fn().mockReturnValue(
        Promise.resolve(<PullRequest>{
          id: 100,
          title: "[ABC-123] feat: adds new widget",
          workloadId: "athena",
          vcsProjectName: "athena",
          repositoryName: "octocat",
        }),
      ),
      buildCommitLink: jest.fn().mockReturnValue("https://github.com/athena/octocat/commit/abc123"),
      buildPRLink: jest.fn().mockReturnValue("https://github.com/athena/octocat/pull/100"),
      getReposForProject: jest.fn().mockReturnValue(null),
      getPROpenTimeFromRepo: jest.fn().mockReturnValue(null),
      getPRSizeFromRepo: jest.fn().mockReturnValue(null),
      getPRsForIssuesFromRepository: jest.fn().mockReturnValue(null),
      fetchChangesInDateRange: jest.fn().mockReturnValue(null),
      summariseChangesInDateRange: jest.fn().mockReturnValue(null),
      buildRepoLink: jest.fn().mockReturnValue(null),
      getEarliestCommitForPr: jest.fn().mockReturnValue(null),
    };
    const issueMgmt: IssueMgmtService = {
      /**
       * Issue for this change.
       */
      matchTicketByIdAndRetrieve: jest.fn().mockReturnValue(
        Promise.resolve(<LightweightIssue>{
          created: "2024-01-01",
          issueType: "Story",
          key: "ABC-123",
          title: "Add a new widget",
          workload: "athena",
        }),
      ),
      buildTicketLink: jest.fn().mockReturnValue("https://jira.example.com/browse/ABC-123"),
      getTicket: jest.fn().mockReturnValue(null),
      getAllTicketIds: jest.fn().mockReturnValue(null),
      fetchTickets: jest.fn().mockReturnValue(null),
      fetchOpenTickets: jest.fn().mockReturnValue(null),
      matchTicketId: function (message: string): string {
        throw new Error("Function not implemented.");
      },
    };
    const change: RepoChange = {
      branch: "feat/abc-123-add-widget",
      commitId: "abc123",
      date: "2024-01-01",
      message: "[ABC-123] feat: adds new widget",
      repo: "octocat",
      workload: "athena",
    };
    const links = await discoverLinks("athena", "athena", vcs, issueMgmt, change);
    expect(links.commitLink).toBe("https://github.com/athena/octocat/commit/abc123");
    expect(links.prTitle).toBe("[ABC-123] feat: adds new widget");
    expect(links.prLink).toBe("https://github.com/athena/octocat/pull/100");
    expect(links.issueId).toBe("ABC-123");
    expect(links.issueType).toBe("Story");
    expect(links.issueTitle).toBe("Add a new widget");
    expect(links.issueLink).toBe("https://jira.example.com/browse/ABC-123");
  });
});
