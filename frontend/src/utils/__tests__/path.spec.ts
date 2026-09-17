import { describe, expect, it } from "vitest";
import { buildPath } from "@/utils/path";

describe("buildPath", () => {
  it("returns path with no query parameters", () => {
    expect(buildPath("/example")).toBe("/example");
  });

  it("returns path with one query parameter", () => {
    expect(buildPath("/example", { foo: "bar" })).toBe("/example?foo=bar");
  });

  it("returns path with multiple query parameters", () => {
    expect(buildPath("/example", { foo: "bar", baz: "qux" })).toBe("/example?foo=bar&baz=qux");
  });

  it("encodes query parameters", () => {
    expect(buildPath("/example", { foo: "baz qux" })).toBe("/example?foo=baz%20qux");
  });

  it("filters out undefined query parameters", () => {
    expect(buildPath("/example", { foo: "bar", baz: undefined })).toBe("/example?foo=bar");
  });

  it("adds leading slash if missing", () => {
    expect(buildPath("example")).toBe("/example");
  });

  it("returns only the path if query parameters are empty", () => {
    expect(buildPath("/example", {})).toBe("/example");
  });

  it("ignores falsy query parameters", () => {
    expect(buildPath("/example", { bar: "baz", foo: "" })).toBe("/example?bar=baz");
    expect(buildPath("/example", { bar: "baz", foo: null })).toBe("/example?bar=baz");
    expect(buildPath("/example", { bar: "baz", foo: undefined })).toBe("/example?bar=baz");
  });

  it("substitutes a path parameter", () => {
    expect(buildPath("/workload/:workloadId/repositories", { workloadId: "athena" })).toBe(
      "/workload/athena/repositories"
    );
  });

  it("substitutes multiple path parameters", () => {
    expect(
      buildPath("/workload/:workloadId/repositories/:repoGroup/:repoName", {
        workloadId: "athena",
        repoGroup: "backend",
        repoName: "org/my-repo",
      })
    ).toBe("/workload/athena/repositories/backend/org%2Fmy-repo");
  });

  it("encodes path parameter values", () => {
    expect(buildPath("/workload/:workloadId", { workloadId: "a b" })).toBe("/workload/a%20b");
  });

  it("appends non-path parameters as query parameters", () => {
    expect(buildPath("/workload/:workloadId/repositories", { workloadId: "athena", branchName: "main" })).toBe(
      "/workload/athena/repositories?branchName=main"
    );
  });

  it("leaves unmatched path parameters intact", () => {
    expect(buildPath("/workload/:workloadId/repositories", { other: "x" })).toBe(
      "/workload/:workloadId/repositories?other=x"
    );
  });

  it("does not substitute a parameter that only shares a name prefix", () => {
    expect(buildPath("/:repo/:repoName", { repo: "platform" })).toBe("/platform/:repoName");
  });

  it("omits falsy path parameters without substituting them", () => {
    expect(buildPath("/workload/:workloadId", { workloadId: undefined })).toBe("/workload/:workloadId");
  });
});
