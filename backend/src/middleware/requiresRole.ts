import { RequestHandler } from "express";
import { forbidden } from "../utils/responses";
import { AuthenticatedRequest } from "./validateJWT";
import { warn } from "../utils/logger/logger";

/**
 * Middleware that checks if the authenticated user has the required role.
 * Must be placed after the {@link requiresAuth} middleware in the chain,
 * as it relies on `req.user` being populated.
 * @param role the role required to access the route
 */
export const requiresRole = (role: string): RequestHandler => {
  return (req, res, next) => {
    const user = (req as AuthenticatedRequest).user;
    if (user?.roles?.includes(role)) {
      return next();
    }
    warn(`User '${user?.name}' does not have required role '${role}'`);
    forbidden(res);
  };
};
