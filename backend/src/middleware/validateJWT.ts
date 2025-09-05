import { RequestHandler } from "express";
import { unauthorised } from "../utils/responses";
import { TokenTypes, validateAccessToken } from "../auth/tokens";
import { Request } from "express";
import { Principal } from "../auth/auth";

/**
 * Represents a request that has been authenticated.
 */
export type AuthenticatedRequest = Request & {
  user: Principal;
};

/**
 * Validates the JWT in the request headers or query parameters, including whether the token type is allowed.
 * @param allowedTokenTypes
 * @param req
 * @param res
 * @param next
 */
const validateJWT = async (allowedTokenTypes: TokenTypes[], req, res, next): Promise<void> => {
  const accessToken = req?.headers?.authorization || (req?.query.token as string);
  if (!accessToken) {
    unauthorised(res);
    return;
  }

  const formattedAccessToken = accessToken.replace("Bearer ", "").trim();
  await validateAccessToken(allowedTokenTypes, formattedAccessToken, (isValid, sub) => {
    if (isValid) {
      (req as AuthenticatedRequest).user = { name: sub };
      return next();
    }
    unauthorised(res);
  });
};

/**
 * Middleware that checks if the request is authenticated, and whether the token type is allowed.
 * @param allowedTokenTypes
 */
export const requiresAuth = (allowedTokenTypes: TokenTypes[]): RequestHandler => {
  return async (req, res, next) => {
    return validateJWT(allowedTokenTypes, req, res, next);
  };
};
