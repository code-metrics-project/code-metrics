import { getFileAuthenticator } from "./impl/file";
import { getCognitoAuthenticator } from "./impl/cognito";
import { getAzureEntraIDAuthenticator } from "./impl/azureEntraId";
import { getLDAPAuthenticator } from "./impl/ldap";
import { getKeyCloakAuthenticator } from "./impl/keycloak";
import { logger, warn } from "../utils/logger/logger";
import express, { Request, Response } from "express";
import { authenticate } from "../routes/authentication";
import { getOidcAuthenticator } from "./impl/oidc";
import { success } from "../utils/responses";
import { SecureRouter } from "../routes/router";
import { getEnvConfigItem } from "../config/sources/source";

export type Principal = {
  name: string;
  roles?: string[];
};

export type AuthenticationResult = {
  success: boolean;
  user?: Principal;
};

export type UserData = {
  sub: string;
  roles?: string[];
};

export type Authenticator = {
  loginUrl?: string;
  authenticateUser(username: string, password: string): Promise<AuthenticationResult>;
  initialise(app: express.Express): Promise<void>;
  configureRoutes(router: SecureRouter): void;
  checkAuthState(req: Request, res: Response): Promise<AuthenticationResult>;
  logout(req: Request, res: Response): Promise<void>;
};

const DEFAULT_AUTHENTICATOR_IMPL = "file";
let authenticator: Authenticator;

/**
 * Determine the {@link Authenticator} to use.
 */
export const getAuthenticator = (): Authenticator => {
  if (!authenticator) {
    const implName = getEnvConfigItem("AUTHENTICATOR_IMPL", DEFAULT_AUTHENTICATOR_IMPL);
    switch (implName) {
      case "cognito":
        authenticator = getCognitoAuthenticator();
        break;
      case "azureEntraId":
        authenticator = getAzureEntraIDAuthenticator();
        break;
      case "file":
        authenticator = getFileAuthenticator();
        break;
      case "ldap":
        authenticator = getLDAPAuthenticator();
        break;
      case "keycloak":
        authenticator = getKeyCloakAuthenticator();
        break;
      case "oidc":
        authenticator = getOidcAuthenticator();
        break;
      default:
        throw new Error(`Unsupported authenticator implementation: ${implName}`);
    }
    logger(`Using ${implName} authenticator`);
  }
  return authenticator;
};

export const logoutUser = async (req: Request, res: Response) => {
  await getAuthenticator().logout(req, res);
};

export const baseAuthenticator: Pick<
  Authenticator,
  "loginUrl" | "initialise" | "configureRoutes" | "checkAuthState" | "logout"
> = {
  loginUrl: null,

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialise: (app: express.Express) => Promise.resolve(),

  configureRoutes: (router: SecureRouter) => {
    router.addUnauthenticatedRoute("post", "/api/authenticate", authenticate);
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  checkAuthState: async (req: Request, res: Response) => {
    warn(`This implementation does not support OIDC authentication.`);
    return { success: false };
  },

  logout: async (req: Request, res: Response) => {
    success(res, {});
  },
};
