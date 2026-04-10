import { describe, it, expect } from "vitest";
import { isTokenExpired, getTokenRoles, hasRole } from "@/utils/auth";

/**
 * Helper to create a fake JWT with a given payload.
 * The signature segment is a dummy value (not cryptographically valid).
 */
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

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

describe("getTokenRoles", () => {
  it("returns an empty array for undefined token", () => {
    expect(getTokenRoles(undefined)).toEqual([]);
  });

  it("returns an empty array for a malformed token", () => {
    expect(getTokenRoles("not.a.valid.jwt.token")).toEqual([]);
  });

  it("returns an empty array for a token with only two segments", () => {
    expect(getTokenRoles("header.payload")).toEqual([]);
  });

  it("returns an empty array when payload has no roles claim", () => {
    const token = makeToken({ sub: "alice", exp: 9999999999 });
    expect(getTokenRoles(token)).toEqual([]);
  });

  it("returns an empty array when roles claim is not an array", () => {
    const token = makeToken({ sub: "alice", roles: "admin" });
    expect(getTokenRoles(token)).toEqual([]);
  });

  it("returns an empty array when roles claim is null", () => {
    const token = makeToken({ sub: "alice", roles: null });
    expect(getTokenRoles(token)).toEqual([]);
  });

  it("returns the roles array from the token payload", () => {
    const token = makeToken({ sub: "alice", roles: ["admin", "viewer"] });
    expect(getTokenRoles(token)).toEqual(["admin", "viewer"]);
  });

  it("returns an empty array when roles is an empty array", () => {
    const token = makeToken({ sub: "alice", roles: [] });
    expect(getTokenRoles(token)).toEqual([]);
  });

  it("returns an empty array when payload cannot be parsed", () => {
    const token = "eyJhbGciOiJIUzI1NiJ9.!!!invalid-base64!!!.fakesig";
    expect(getTokenRoles(token)).toEqual([]);
  });
});

describe("hasRole", () => {
  it("returns false for undefined token", () => {
    expect(hasRole(undefined, "admin")).toBe(false);
  });

  it("returns false when the token has no roles", () => {
    const token = makeToken({ sub: "alice" });
    expect(hasRole(token, "admin")).toBe(false);
  });

  it("returns true when the token contains the specified role", () => {
    const token = makeToken({ sub: "alice", roles: ["admin", "viewer"] });
    expect(hasRole(token, "admin")).toBe(true);
  });

  it("returns false when the token does not contain the specified role", () => {
    const token = makeToken({ sub: "alice", roles: ["viewer"] });
    expect(hasRole(token, "admin")).toBe(false);
  });

  it("is case-sensitive", () => {
    const token = makeToken({ sub: "alice", roles: ["Admin"] });
    expect(hasRole(token, "admin")).toBe(false);
  });

  it("returns true for a role in a list of many roles", () => {
    const token = makeToken({ sub: "alice", roles: ["viewer", "editor", "admin", "superuser"] });
    expect(hasRole(token, "editor")).toBe(true);
  });
});
