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
    expect(buildPath("/example", { foo: "bar", baz: "qux" })).toBe(
      "/example?foo=bar&baz=qux",
    );
  });

  it("encodes query parameters", () => {
    expect(buildPath("/example", { foo: "baz qux" })).toBe(
      "/example?foo=baz%20qux",
    );
  });

  it("filters out undefined query parameters", () => {
    expect(buildPath("/example", { foo: "bar", baz: undefined })).toBe(
      "/example?foo=bar",
    );
  });

  it("adds leading slash if missing", () => {
    expect(buildPath("example")).toBe("/example");
  });

  it("returns only the path if query parameters are empty", () => {
    expect(buildPath("/example", {})).toBe("/example");
  });

  it("ignores falsy query parameters", () => {
    expect(buildPath("/example", { bar: "baz", foo: "" })).toBe(
      "/example?bar=baz",
    );
    expect(buildPath("/example", { bar: "baz", foo: null })).toBe(
      "/example?bar=baz",
    );
    expect(buildPath("/example", { bar: "baz", foo: undefined })).toBe(
      "/example?bar=baz",
    );
  });
});
