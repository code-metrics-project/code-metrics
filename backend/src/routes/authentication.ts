import { Request, Response } from "express";
import {notFound, serverError, success, unauthorised} from "../utils/responses";
import { logoutUser } from "../auth/auth";
import {
  generateSecurityTokensFromLogin,
  generateSecurityTokensFromQuery,
  refreshSecurityTokens,
  SecurityTokens,
} from "../auth/tokens";
import { AuthenticatedRequest } from "../middleware/validateJWT";
import {
  generateLongLivedAccessToken,
  listLongLivedAccessTokenIds,
  revokeLongLivedAccessToken
} from "../auth/long_lived";
import { warn } from "../utils/logger/logger";

const respondWithAuthState = (tokens: SecurityTokens | null, res: Response) => {
  if (tokens) {
    const { accessToken, refreshToken } = tokens;
    return success(res, { accessToken, refreshToken });
  }
  return unauthorised(res);
};

export const checkAuthenticated = async (req: Request, res: Response) => {
  const tokens = await generateSecurityTokensFromQuery(req, res);
  respondWithAuthState(tokens, res);
};

export const authenticate = async (req: Request, res: Response) => {
  const tokens = await generateSecurityTokensFromLogin(req.body?.username, req.body?.password);
  respondWithAuthState(tokens, res);
};

/**
 * Generates a long-lived service token for the user.
 * @param req
 * @param res
 */
export const generateServiceToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    const subject = req.body?.subject;
    if (!subject || typeof subject !== "string" || !subject.trim().length) {
      return notFound(res, { error: "Missing or invalid subject for long-lived access token" });
    }
    const tokens = await generateLongLivedAccessToken(subject, req.user);
    return respondWithAuthState(tokens, res);
  } else {
    return unauthorised(res);
  }
};

/**
 * Lists all long-lived service token IDs.
 * @param req
 * @param res
 */
export const listServiceTokenIds = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    try {
      const tokenIds = await listLongLivedAccessTokenIds();
      res.status(200).send(tokenIds);
    } catch (e) {
      warn(`Failed to list long-lived access tokens: ${e.message}`);
      return serverError(res, { error: "Failed to list long-lived access tokens" });
    }
  } else {
    return unauthorised(res);
  }
};

/**
 * Revokes a long-lived service token.
 * @param req
 * @param res
 */
export const revokeServiceToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tokenId = req.params.tokenId;
    const result = await revokeLongLivedAccessToken(tokenId);
    if (!result) {
      warn(`Failed to revoke access token with ID: ${tokenId}`);
      return notFound(res, { error: "Failed to revoke long-lived access token" });
    } else {
      success(res, { message: "Long-lived access token revoked successfully" });
    }
  } catch (e) {
    warn(`Failed to revoke long-lived access token: ${e.message}`);
    return serverError(res, { error: "Failed to revoke long-lived access token" });
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  await refreshSecurityTokens(req.body?.refreshToken, (tokens?: SecurityTokens) => {
    respondWithAuthState(tokens, res);
  });
};

export const logout = async (req: Request, res: Response) => {
  await logoutUser(req, res);
};
