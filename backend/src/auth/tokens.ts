import { Request, Response } from "express";
import { verbose, warn } from "../utils/logger/logger";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { AuthenticationResult, getAuthenticator, UserData } from "./auth";
import { validateLongLivedAccessToken } from "./long_lived";
import ms from "ms";
import { getConfigItem } from "../config/sources/source";
import { getRBACService } from "../services/rbac/rbacService";

export type SecurityTokens = {
  accessToken: string;
  refreshToken: string;
};

export type TokenTypes = "access_token" | "refresh_token" | "long_lived_access_token";

export type TokenPayload = JwtPayload & {
  /**
   * Type of the token, indicating its purpose.
   */
  token_type: TokenTypes;

  /**
   * Roles assigned to the user via RBAC.
   */
  roles?: string[];
};

export type GeneratedToken = {
  /**
   * The JWT ID (`jti`); a unique identifier for the token.
   */
  tokenId: string;

  /**
   * The issue time of the token.
   */
  created: Date;

  /**
   * The expiry time of the token.
   */
  expires: Date;

  /**
   * The JWT token string.
   */
  token: string;
};

const ISS = "code-metrics-tool";
const AUD = "all";

const accessTokenTtl = getConfigItem("ACCESS_TOKEN_TTL", "10m");
const refreshTokenTtl = getConfigItem("REFRESH_TOKEN_TTL", "60m");

let tokenSecret: string;
export const getTokenSecret = () => {
  if (!tokenSecret) {
    tokenSecret = getConfigItem("ACCESS_TOKEN_SECRET");
    if (!tokenSecret) {
      throw new Error("ACCESS_TOKEN_SECRET environment variable is required");
    }
  }
  return tokenSecret;
};

const getCommonJwtClaims = (subject: string): SignOptions => ({
  jwtid: crypto.randomUUID(),
  issuer: ISS,
  audience: AUD,
  subject,
});

const generateAccessToken = (subject: string, roles?: string[]) => {
  return generateToken(subject, "access_token", accessTokenTtl, roles);
};

const generateRefreshToken = (subject: string, roles?: string[]) => {
  return generateToken(subject, "refresh_token", refreshTokenTtl, roles);
};

/**
 * Generates a JWT token with the specified subject, token type, and time-to-live (TTL).
 * @param subject
 * @param token_type
 * @param ttl
 * @param roles
 */
export const generateToken = (subject: string, token_type: TokenTypes, ttl: string, roles?: string[]): GeneratedToken => {
  const issuedAt = new Date();
  const ttlMs = ms(ttl);
  const expires = new Date(issuedAt.getTime() + ttlMs);

  const commonClaims = getCommonJwtClaims(subject);
  const token = jwt.sign({ token_type, roles }, getTokenSecret(), {
    ...commonClaims,
    expiresIn: ttl,
  });
  return {
    tokenId: commonClaims.jwtid,
    created: issuedAt,
    expires,
    token,
  };
};

const getSecurityTokens = (userData: UserData): SecurityTokens => {
  const accessToken = generateAccessToken(userData.sub, userData.roles);
  const refreshToken = generateRefreshToken(userData.sub, userData.roles);
  return { accessToken: accessToken.token, refreshToken: refreshToken.token };
};

const handleAuthResult = async (result: AuthenticationResult) => {
  if (result.success) {
    const roles = await getRBACService().getRolesForUser(result.user.name);
    const userData: UserData = { sub: result.user.name, roles };
    return getSecurityTokens(userData);
  }

  return null;
};

export const generateSecurityTokensFromLogin = async (
  username: string | undefined,
  password: string | undefined,
): Promise<SecurityTokens | null> => {
  if (username?.length && password?.length) {
    const result = await getAuthenticator().authenticateUser(username, password);
    return handleAuthResult(result);
  }
  warn("Missing username or password");
  return null;
};

export const generateSecurityTokensFromQuery = async (req: Request, res: Response): Promise<SecurityTokens | null> => {
  const result = await getAuthenticator().checkAuthState(req, res);
  return handleAuthResult(result);
};

/**
 * Validates the provided access token, invoking the callback with `true` if valid,
 * `false` if invalid or no token was provided.
 * @param allowedTokenTypes the types of tokens that are allowed
 * @param accessToken
 * @param callback
 */
export const validateAccessToken = async (
  allowedTokenTypes: TokenTypes[],
  accessToken: string | undefined,
  callback: (valid: boolean, sub?: string, roles?: string[]) => void,
): Promise<void> => {
  if (!accessToken) {
    warn("No access token provided");
    callback(false);
    return;
  }

  jwt.verify(
    accessToken,
    getTokenSecret(),
    { audience: AUD, issuer: ISS },
    (err, decoded: TokenPayload) => {
      if (err) {
        warn("Invalid access token:", err);
        callback(false);
        return;
      }

      // is the token type allowed?
      if (!decoded || !decoded.token_type || !allowedTokenTypes.includes(decoded.token_type)) {
        warn(`Token type ${decoded?.token_type} is not allowed`);
        callback(false);
        return;
      }

      // validate the token based on its type
      switch (decoded?.token_type) {
        case "access_token":
          verbose("Access token is valid");
          callback(true, decoded.sub, decoded.roles);
          break;
        case "long_lived_access_token":
          validateLongLivedAccessToken(decoded, callback);
          break;
        default:
          warn(`Unexpected token type: ${decoded?.token_type}`);
          callback(false);
          return;
      }
    },
  );
};

/**
 * Refreshes the security tokens using the provided refresh token, invoking the callback with the new tokens
 * if successful, or `null` if the refresh token is invalid or not provided.
 * @param refreshToken
 * @param callback
 */
export const refreshSecurityTokens = async (
  refreshToken: string | undefined,
  callback: (tokens?: SecurityTokens) => void,
): Promise<void> => {
  if (!refreshToken) {
    warn("No refresh token provided");
    callback(null);
    return;
  }

  jwt.verify(
    refreshToken,
    getTokenSecret(),
    {
      audience: AUD,
      issuer: ISS,
    },
    async (err, decoded: JwtPayload) => {
      if (err) {
        warn("Invalid refresh token", err);
        callback(null);
        return;
      }

      verbose("Generating new access token from refresh token");
      // Re-fetch roles from the RBAC service to pick up any role changes
      const roles = await getRBACService().getRolesForUser(decoded.sub);
      const accessToken = generateAccessToken(decoded.sub, roles);
      const updated: SecurityTokens = {
        accessToken: accessToken.token,

        // don't return a new refresh token
        refreshToken: "",
      };
      callback(updated);
    },
  );
};

export const testables = {
  getSecurityTokens,
  generateAccessToken,
  generateRefreshToken,
};
