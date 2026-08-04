import { groupPRsPerIssue } from "../prs-per-issue";
import { groupIssuesPerPR } from "../issues-per-pr";
import { IssueWithPRCount, PRWithIssueCount } from "../../../model/vcs";

jest.mock("../../../utils/repos", () => ({
  lookupRepoGroupForRepoName: jest.fn(() => "default-group"),
}));

describe("PR and Issue coupling query grouping", () => {
  it("aggregates prs-per-issue per day and repo", () => {
    const data: IssueWithPRCount[] = [
      {
        workloadId: "teamA",
        projectName: "project1",
        repositoryName: "repo1",
        changes: [
          { date: "2026-01-10", issueId: "PROJ-1", prCount: 2, prIds: [] },
          { date: "2026-01-10", issueId: "PROJ-2", prCount: 1, prIds: [] },
        ],
      },
    ];

    const grouped = groupPRsPerIssue(data);
    const day = grouped.get("2026-01-10");

    expect(day?.["prs-per-issue"]?.length).toBe(1);
    expect(day?.["prs-per-issue"]?.[0].value).toBe(1.5);
  });

  it("aggregates issues-per-pr per day and repo", () => {
    const data: PRWithIssueCount[] = [
      {
        workloadId: "teamA",
        projectName: "project1",
        repositoryName: "repo1",
        changes: [
          { date: "2026-01-10", prId: "101", issueCount: 2, issueIds: ["PROJ-1", "PROJ-2"] },
          { date: "2026-01-10", prId: "102", issueCount: 0, issueIds: [] },
        ],
      },
    ];

    const grouped = groupIssuesPerPR(data);
    const day = grouped.get("2026-01-10");

    expect(day?.["issues-per-pr"]?.length).toBe(1);
    expect(day?.["issues-per-pr"]?.[0].value).toBe(1);
  });

  it("returns empty maps for empty inputs", () => {
    expect(groupPRsPerIssue([])).toEqual(new Map());
    expect(groupIssuesPerPR([])).toEqual(new Map());
  });
});
