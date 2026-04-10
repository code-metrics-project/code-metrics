import { describe, expect, it } from "vitest";
import { roundTo } from "../math";

describe("math", () => {
  describe("roundTo", () => {
    it("should round to 2 digits", () => {
      expect(roundTo(1.23456, 2)).toBe(1.23);
    });

    it("should round to 1 digit", () => {
      expect(roundTo(1.23456, 1)).toBe(1.2);
    });

    it("should round to 0 digits", () => {
      expect(roundTo(1.23456, 0)).toBe(1);
    });

    it("should round to 0 digits by default", () => {
      expect(roundTo(1.23456)).toBe(1);
    });
  });
});
