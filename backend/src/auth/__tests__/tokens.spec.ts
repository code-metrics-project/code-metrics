import { testables, validateAccessToken, generateSecurityTokensFromLogin, refreshSecurityTokens } from "../tokens";

jest.mock("../auth", () => ({
  getAuthenticator: () => ({
    authenticateUser: jest.fn((u, p) =>
      Promise.resolve(u === "user" && p === "pass"
        ? { success: true, user: { name: "user" } }
        : { success: false }
      )
    ),
    checkAuthState: jest.fn(() => Promise.resolve({ success: true, user: { name: "user" } })),
  }),
}));

jest.mock("../../services/rbac/rbacService", () => ({
  getRBACService: () => ({
    getRolesForUser: jest.fn(() => Promise.resolve([])),
  }),
}));

process.env.ACCESS_TOKEN_SECRET = "testsecret";

describe("tokens", () => {
  it("generates access and refresh tokens", () => {
    const userData = { sub: "user" };
    const { accessToken, refreshToken } = testables.getSecurityTokens(userData);
    expect(typeof accessToken).toBe("string");
    expect(typeof refreshToken).toBe("string");
  });

  it("validates a valid access token", async () => {
    const accessToken = testables.generateAccessToken("user");
    const callback = jest.fn();
    await validateAccessToken(["access_token"], accessToken.token, callback);
    expect(callback).toHaveBeenCalledWith(true, "user", undefined);
  });

  it("fails validation for a valid access token of the wrong type", async () => {
    const accessToken = testables.generateAccessToken("user");
    const callback = jest.fn();
    await validateAccessToken(["long_lived_access_token"], accessToken.token, callback);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it("fails validation for an invalid access token", async () => {
    const callback = jest.fn();
    await validateAccessToken(["access_token"], "invalid.token", callback);
    expect(callback).toHaveBeenCalledWith(false);
  });

  it("returns null for invalid login", async () => {
    const result = await generateSecurityTokensFromLogin("bad", "creds");
    expect(result).toBeNull();
  });

  it("returns tokens for valid login", async () => {
    const result = await generateSecurityTokensFromLogin("user", "pass");
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
  });

  it("refreshes tokens with a valid refresh token", async () => {
    const refreshToken = testables.generateRefreshToken("user").token;
    const callback = jest.fn();
    await refreshSecurityTokens(refreshToken, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: expect.any(String), refreshToken: "" })
    );
  });

  it("fails to refresh with invalid refresh token", async () => {
    const callback = jest.fn();
    await refreshSecurityTokens("bad.token", callback);
    expect(callback).toHaveBeenCalledWith(null);
  });
});
