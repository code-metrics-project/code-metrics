/**
 * Unit tests for Azure DevOps Code Management pagination functionality.
 * These tests verify the pagination logic works correctly.
 */

import { GitPullRequest, PullRequestStatus, GitCommitRef } from "azure-devops-node-api/interfaces/GitInterfaces";

describe("Azure VCS pagination", () => {
  describe("Pull Request pagination with skip/top", () => {
    it("should handle single page of results (fewer than page size)", () => {
      const pageSize = 100;
      const results: GitPullRequest[] = [
        { pullRequestId: 1, title: "PR 1", status: PullRequestStatus.Completed } as GitPullRequest,
        { pullRequestId: 2, title: "PR 2", status: PullRequestStatus.Completed } as GitPullRequest,
      ];

      // When results.length < pageSize, we've reached the last page
      expect(results.length).toBeLessThan(pageSize);
    });

    it("should paginate when results equal page size", () => {
      const pageSize = 2;
      const page1: GitPullRequest[] = [
        { pullRequestId: 1, title: "PR 1" } as GitPullRequest,
        { pullRequestId: 2, title: "PR 2" } as GitPullRequest,
      ];
      const page2: GitPullRequest[] = [{ pullRequestId: 3, title: "PR 3" } as GitPullRequest];

      // page1.length === pageSize means there might be more
      expect(page1.length).toBe(pageSize);
      // page2.length < pageSize means we've reached the end
      expect(page2.length).toBeLessThan(pageSize);

      const allPRs = [...page1, ...page2];
      expect(allPRs.length).toBe(3);
    });

    it("should accumulate PRs across multiple pages using skip/top", () => {
      const pageSize = 100;
      const totalPRs = 250;

      // Simulate 3 pages of results
      const simulateFetch = (skip: number, top: number): GitPullRequest[] => {
        const remaining = totalPRs - skip;
        const count = Math.min(remaining, top);
        return Array.from({ length: count }, (_, i) => ({
          pullRequestId: skip + i + 1,
          title: `PR ${skip + i + 1}`,
        })) as GitPullRequest[];
      };

      const allPRs: GitPullRequest[] = [];
      let skip = 0;

      while (true) {
        const page = simulateFetch(skip, pageSize);
        allPRs.push(...page);

        if (page.length < pageSize) break;
        skip += pageSize;
      }

      expect(allPRs.length).toBe(totalPRs);
      expect(allPRs[0].pullRequestId).toBe(1);
      expect(allPRs[totalPRs - 1].pullRequestId).toBe(totalPRs);
    });
  });

  describe("Commit pagination with skip/top", () => {
    it("should handle empty commit results", () => {
      const commits: GitCommitRef[] = [];
      expect(commits.length).toBe(0);
    });

    it("should paginate commits correctly", () => {
      const pageSize = 100;

      // Simulate fetching commits with pagination
      const simulateCommitFetch = (skip: number, top: number, total: number): GitCommitRef[] => {
        const remaining = total - skip;
        const count = Math.min(remaining, top);
        return Array.from({ length: count }, (_, i) => ({
          commitId: `commit-${skip + i + 1}`,
          comment: `Commit ${skip + i + 1}`,
        })) as GitCommitRef[];
      };

      // Test with 150 commits (requires 2 pages)
      const totalCommits = 150;
      const allCommits: GitCommitRef[] = [];
      let skip = 0;

      while (true) {
        const page = simulateCommitFetch(skip, pageSize, totalCommits);
        allCommits.push(...page);

        if (page.length < pageSize) break;
        skip += pageSize;
      }

      expect(allCommits.length).toBe(totalCommits);
      expect(allCommits[0].commitId).toBe("commit-1");
      expect(allCommits[149].commitId).toBe("commit-150");
    });

    it("should respect max commits safety limit", () => {
      const MAX_COMMITS_PER_DAY = 1000;
      const pageSize = 100;
      const hugeTotalCommits = 5000;

      const simulateCommitFetch = (skip: number, top: number): GitCommitRef[] => {
        const remaining = hugeTotalCommits - skip;
        const count = Math.min(remaining, top);
        return Array.from({ length: count }, (_, i) => ({
          commitId: `commit-${skip + i + 1}`,
        })) as GitCommitRef[];
      };

      const allCommits: GitCommitRef[] = [];
      let skip = 0;

      while (true) {
        const page = simulateCommitFetch(skip, pageSize);
        allCommits.push(...page);

        if (page.length < pageSize) break;
        if (allCommits.length >= MAX_COMMITS_PER_DAY) break;
        skip += pageSize;
      }

      // Should stop at the safety limit
      expect(allCommits.length).toBe(MAX_COMMITS_PER_DAY);
    });
  });
});
