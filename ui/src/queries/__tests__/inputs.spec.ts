import { describe, expect, it } from "vitest";
import { isPopulatedInputValue } from "@/queries/inputs";

describe("isPopulatedInputValue", () => {
  it("returns false for undefined", () => {
    expect(isPopulatedInputValue(undefined)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPopulatedInputValue(null)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isPopulatedInputValue([])).toBe(false);
  });

  it("returns true for non-empty array", () => {
    expect(isPopulatedInputValue([1, 2, 3])).toBe(true);
  });

  it("returns false for empty object", () => {
    expect(isPopulatedInputValue({})).toBe(false);
  });

  it("returns true for non-empty object", () => {
    expect(isPopulatedInputValue({ key: "value" })).toBe(true);
  });

  it("returns true for non-empty string", () => {
    expect(isPopulatedInputValue("string")).toBe(true);
  });

  it("returns true for number", () => {
    expect(isPopulatedInputValue(123)).toBe(true);
  });

  it("returns true for boolean true", () => {
    expect(isPopulatedInputValue(true)).toBe(true);
  });

  it("returns true for boolean false", () => {
    expect(isPopulatedInputValue(false)).toBe(true);
  });
});
