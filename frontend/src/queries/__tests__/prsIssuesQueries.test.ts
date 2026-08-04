import { describe, expect, it, vi } from "vitest";
import { InputType } from "@/components/inputs/inputTypes";
import { getInputTypesForQueries } from "@/queries/queryInputs";
import { getGroupByDimensions } from "@/queries/groupBy";
import { getQueryTitle } from "@/queries/summary";
import { getTransformersForQueries, QueryName, TransformerId } from "@/components/transformers/transform";

vi.mock("@/config/features", () => ({
  Features: { mlForecasts: "mlForecasts" },
  isFeatureActive: vi.fn(() => false),
}));

describe("PRs/Issues query mappings", () => {
  it("includes required inputs for prs-per-issue", () => {
    const inputTypes = getInputTypesForQueries(["prs-per-issue"]);

    expect(inputTypes).toEqual(
      expect.arrayContaining([InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE])
    );
  });

  it("includes required inputs for issues-per-pr", () => {
    const inputTypes = getInputTypesForQueries(["issues-per-pr"]);

    expect(inputTypes).toEqual(
      expect.arrayContaining([InputType.TAGS, InputType.WORKLOAD_NAMES, InputType.REPO_GROUPS, InputType.START_DATE])
    );
  });

  it("returns no input types for unknown query", () => {
    expect(getInputTypesForQueries(["unknown-query"])).toEqual([]);
  });

  it("returns shared groupBy dimensions for both new queries", () => {
    expect(getGroupByDimensions(["prs-per-issue", "issues-per-pr"]).sort()).toEqual(
      ["workloadId", "repoGroup", "tag"].sort()
    );
  });

  it("returns no shared groupBy dimensions when unknown query is included", () => {
    expect(getGroupByDimensions(["prs-per-issue", "unknown-query"])).toEqual([]);
  });

  it("resolves human-friendly summary titles", () => {
    expect(getQueryTitle("prs-per-issue")).toBe("PRs per issue");
    expect(getQueryTitle("issues-per-pr")).toBe("Issues per PR");
  });

  it("enables rolling averages transformer for both new queries", () => {
    const transformerMap = getTransformersForQueries(["prs-per-issue", "issues-per-pr"]);

    const prsPerIssueTransformers = transformerMap.get(QueryName.PRsPerIssue) ?? [];
    const issuesPerPrTransformers = transformerMap.get(QueryName.IssuesPerPR) ?? [];

    expect(prsPerIssueTransformers.some((t) => t.id === TransformerId.RollingAverages)).toBe(true);
    expect(issuesPerPrTransformers.some((t) => t.id === TransformerId.RollingAverages)).toBe(true);
  });
});
