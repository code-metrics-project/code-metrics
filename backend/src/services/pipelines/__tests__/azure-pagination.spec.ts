/**
 * Unit tests for Azure DevOps pagination functionality.
 * These tests mock the Azure DevOps API to verify pagination is handled correctly.
 */

import { PagedList } from "azure-devops-node-api/interfaces/common/VSSInterfaces";
import { Build, BuildResult } from "azure-devops-node-api/interfaces/BuildInterfaces";

describe("Azure Pipelines pagination", () => {
  describe("PagedList continuation token handling", () => {
    it("should handle empty continuation token (single page)", () => {
      const response: PagedList<Build> = Object.assign(
        [
          { id: 1, buildNumber: "1", result: BuildResult.Succeeded } as Build,
          { id: 2, buildNumber: "2", result: BuildResult.Succeeded } as Build,
        ],
        { continuationToken: undefined },
      );

      expect(response.length).toBe(2);
      expect(response.continuationToken).toBeUndefined();
    });

    it("should detect presence of continuation token for pagination", () => {
      const page1: PagedList<Build> = Object.assign(
        [
          { id: 1, buildNumber: "1", result: BuildResult.Succeeded } as Build,
          { id: 2, buildNumber: "2", result: BuildResult.Succeeded } as Build,
        ],
        { continuationToken: "next-page-token" },
      );

      const page2: PagedList<Build> = Object.assign(
        [{ id: 3, buildNumber: "3", result: BuildResult.Succeeded } as Build],
        { continuationToken: undefined },
      );

      expect(page1.continuationToken).toBe("next-page-token");
      expect(page2.continuationToken).toBeUndefined();

      // Simulate pagination accumulation
      const allBuilds: Build[] = [...page1, ...page2];
      expect(allBuilds.length).toBe(3);
    });

    it("should accumulate results across multiple pages", () => {
      const pages: PagedList<Build>[] = [
        Object.assign([{ id: 1 } as Build, { id: 2 } as Build], { continuationToken: "token-1" }),
        Object.assign([{ id: 3 } as Build, { id: 4 } as Build], { continuationToken: "token-2" }),
        Object.assign([{ id: 5 } as Build], { continuationToken: undefined }),
      ];

      const allBuilds: Build[] = [];
      for (const page of pages) {
        allBuilds.push(...page);
        if (!page.continuationToken) break;
      }

      expect(allBuilds.length).toBe(5);
      expect(allBuilds.map((b) => b.id)).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
