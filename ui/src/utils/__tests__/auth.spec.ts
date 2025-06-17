import { describe, it, expect } from "vitest";
import { isTokenExpired } from "@/utils/auth";

describe("isTokenExpired", () => {
  it("returns true if token is undefined", () => {
    expect(isTokenExpired(undefined)).toBe(true);
  });

  it("returns true if token is not a valid JWT", () => {
    expect(isTokenExpired("invalid.token")).toBe(true);
  });

  it("returns true if token has expired", () => {
    const expiredToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.s5c8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Q";
    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  it("returns false if token is valid and not expired", () => {
    const validToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQ3MDAwMDAwMDB9.s5c8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Q";
    expect(isTokenExpired(validToken)).toBe(false);
  });

  it("returns true if token payload cannot be parsed", () => {
    const invalidPayloadToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidPayload.s5c8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Qm8Q";
    expect(isTokenExpired(invalidPayloadToken)).toBe(true);
  });
});
