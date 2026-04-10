import jwt from "jsonwebtoken";
import {
  testables,
  validateAccessToken,
  generateSecurityTokensFromLogin,
  refreshSecurityTokens,
  TokenPayload,
} from "../tokens";

const mockGetRolesForUser = jest.fn();

jest.mock("../auth", () => ({
  getAuthenticator: () => ({
    authenticateUser: jest.fn((u, p) =>
      Promise.resolve(
        u === "admin-user" && p === "pass" ? { success: true, user: { name: "admin-user" } } : { success: false },
      ),
    ),
    checkAuthState: jest.fn(() => Promise.resolve({ success: true, user: { name: "admin-user" } })),
  }),
}));

jest.mock("../../services/rbac/rbacService", () => ({
  getRBACService: () => ({
    getRolesForUser: mockGetRolesForUser,
  }),
}));

jest.mock("../../utils/logger/logger", () => ({
  logger: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

process.env.ACCESS_TOKEN_SECRET = "testsecret-rbac";

describe("tokens RBAC integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateToken with roles", () => {
    it("should include roles in the JWT payload", () => {
      const generated = testables.generateAccessToken("alice", ["admin", "viewer"]);
      const decoded = jwt.decode(generated.token) as TokenPayload;

      expect(decoded.roles).toEqual(["admin", "viewer"]);
      expect(decoded.sub).toBe("alice");
      expect(decoded.token_type).toBe("access_token");
    });

    it("should include empty roles array in the JWT payload when no roles provided", () => {
      const generated = testables.generateAccessToken("alice", []);
      const decoded = jwt.decode(generated.token) as TokenPayload;

      expect(decoded.roles).toEqual([]);
    });

    it("should have undefined roles when roles parameter is omitted", () => {
      const generated = testables.generateAccessToken("alice");
      const decoded = jwt.decode(generated.token) as TokenPayload;

      expect(decoded.roles).toBeUndefined();
    });

    it("should include roles in refresh token payload", () => {
      const generated = testables.generateRefreshToken("alice", ["editor"]);
      const decoded = jwt.decode(generated.token) as TokenPayload;

      expect(decoded.roles).toEqual(["editor"]);
      expect(decoded.token_type).toBe("refresh_token");
    });
  });

  describe("getSecurityTokens with roles", () => {
    it("should pass roles through to both access and refresh tokens", () => {
      const tokens = testables.getSecurityTokens({ sub: "alice", roles: ["admin"] });

      const accessDecoded = jwt.decode(tokens.accessToken) as TokenPayload;
      const refreshDecoded = jwt.decode(tokens.refreshToken) as TokenPayload;

      expect(accessDecoded.roles).toEqual(["admin"]);
      expect(refreshDecoded.roles).toEqual(["admin"]);
    });

    it("should generate tokens without roles when UserData has no roles", () => {
      const tokens = testables.getSecurityTokens({ sub: "alice" });

      const accessDecoded = jwt.decode(tokens.accessToken) as TokenPayload;
      expect(accessDecoded.roles).toBeUndefined();
    });
  });

  describe("validateAccessToken with roles", () => {
    it("should pass roles to the callback for a valid token", async () => {
      const generated = testables.generateAccessToken("alice", ["admin", "viewer"]);
      const callback = jest.fn();

      await validateAccessToken(["access_token"], generated.token, callback);

      expect(callback).toHaveBeenCalledWith(true, "alice", ["admin", "viewer"]);
    });

    it("should pass undefined roles when token has no roles claim", async () => {
      const generated = testables.generateAccessToken("alice");
      const callback = jest.fn();

      await validateAccessToken(["access_token"], generated.token, callback);

      expect(callback).toHaveBeenCalledWith(true, "alice", undefined);
    });
  });

  describe("generateSecurityTokensFromLogin with RBAC", () => {
    it("should fetch roles from RBAC service and include them in tokens", async () => {
      mockGetRolesForUser.mockResolvedValue(["admin", "viewer"]);

      const result = await generateSecurityTokensFromLogin("admin-user", "pass");

      expect(mockGetRolesForUser).toHaveBeenCalledWith("admin-user");
      expect(result).not.toBeNull();

      const accessDecoded = jwt.decode(result!.accessToken) as TokenPayload;
      expect(accessDecoded.roles).toEqual(["admin", "viewer"]);
    });

    it("should include empty roles when user has no RBAC roles", async () => {
      mockGetRolesForUser.mockResolvedValue([]);

      const result = await generateSecurityTokensFromLogin("admin-user", "pass");

      expect(result).not.toBeNull();

      const accessDecoded = jwt.decode(result!.accessToken) as TokenPayload;
      expect(accessDecoded.roles).toEqual([]);
    });
  });

  describe("refreshSecurityTokens with RBAC", () => {
    it("should re-fetch roles from RBAC service when refreshing", async () => {
      // Generate a refresh token with initial roles
      const refreshToken = testables.generateRefreshToken("admin-user", ["viewer"]).token;

      // On refresh, the RBAC service returns updated roles
      mockGetRolesForUser.mockResolvedValue(["admin", "viewer"]);

      const callback = jest.fn();
      await refreshSecurityTokens(refreshToken, callback);

      expect(mockGetRolesForUser).toHaveBeenCalledWith("admin-user");
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: expect.any(String), refreshToken: "" }),
      );

      // Verify the new access token has the updated roles
      const newTokens = callback.mock.calls[0][0];
      const accessDecoded = jwt.decode(newTokens.accessToken) as TokenPayload;
      expect(accessDecoded.roles).toEqual(["admin", "viewer"]);
    });

    it("should pick up role changes on refresh (role was added)", async () => {
      // User originally had no roles
      const refreshToken = testables.generateRefreshToken("admin-user", []).token;

      // Now user has been granted admin
      mockGetRolesForUser.mockResolvedValue(["admin"]);

      const callback = jest.fn();
      await refreshSecurityTokens(refreshToken, callback);

      const newTokens = callback.mock.calls[0][0];
      const accessDecoded = jwt.decode(newTokens.accessToken) as TokenPayload;
      expect(accessDecoded.roles).toEqual(["admin"]);
    });

    it("should pick up role changes on refresh (role was removed)", async () => {
      // User originally had admin
      const refreshToken = testables.generateRefreshToken("admin-user", ["admin"]).token;

      // Now user has had admin removed
      mockGetRolesForUser.mockResolvedValue([]);

      const callback = jest.fn();
      await refreshSecurityTokens(refreshToken, callback);

      const newTokens = callback.mock.calls[0][0];
      const accessDecoded = jwt.decode(newTokens.accessToken) as TokenPayload;
      expect(accessDecoded.roles).toEqual([]);
    });
  });
});
