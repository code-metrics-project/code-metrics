import jwt from "jsonwebtoken";
import { getFileAuthenticator } from "./impl/file";
import { getCognitoAuthenticator } from "./impl/cognito";
import { getAzureEntraIDAuthenticator } from "./impl/azureEntraId";
import { getLDAPAuthenticator } from "./impl/ldap";
import { getKeyCloakAuthenticator } from "./impl/keycloak";
import { logger, warn } from "../utils/logger/logger";
import express, { Request, Response } from "express";
import { authenticate } from "../routes/authenticate";
import { getOidcAuthenticator } from "./impl/oidc";
import { success } from "../utils/responses";
import { SecureRouter } from "../routes/router";

type Principal = {
  name: string;
};

export type AuthenticationResult = {
  success: boolean;
  user?: Principal;
};

export type Authenticator = {
  loginUrl?: string;
  authenticateUser(username: string, password: string): Promise<AuthenticationResult>;
  initialise(app: express.Express): Promise<void>;
  configureRoutes(router: SecureRouter): void;
  checkAuthState(req: Request, res: Response): Promise<AuthenticationResult>;
  logout(req: Request, res: Response): Promise<void>;
};

export const ISS = "code-metrics-tool";
export const AUD = "all";

const accessTokenTtl = process.env.ACCESS_TOKEN_TTL ?? "1h";

let accessTokenSecret: string;

const DEFAULT_AUTHENTICATOR_IMPL = "file";
let authenticator: Authenticator;

/**
 * Determine the {@link Authenticator} to use.
 */
export const getAuthenticator = (): Authenticator => {
  if (!authenticator) {
    const implName = process.env.AUTHENTICATOR_IMPL ?? DEFAULT_AUTHENTICATOR_IMPL;
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

export const getAccessTokenSecret = () => {
  if (!accessTokenSecret) {
    accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  }
  return accessTokenSecret;
};

const getAccessToken = (userData: UserData) =>
  jwt.sign({}, getAccessTokenSecret(), {
    expiresIn: accessTokenTtl,
    issuer: ISS,
    audience: [AUD],
    subject: userData.sub,
  });

export type UserData = {
  sub: string;
};

export type UserTokens = {
  accessToken: string;
};

export const getUserTokens = (userData: UserData): UserTokens => {
  return {
    accessToken: getAccessToken(userData),
  };
};

function handleAuthResult(result: AuthenticationResult) {
  if (result.success) {
    const userData = { sub: result.user.name };
    return getUserTokens(userData);
  }

  return null;
}

export const getUserTokensFromLogin = async (username: string, password: string): Promise<UserTokens | null> => {
  if (!username || !password) {
    warn("Missing username or password");
    return null;
  }
  const result = await getAuthenticator().authenticateUser(username, password);
  return handleAuthResult(result);
};

export const getUserTokensFromQuery = async (req: Request, res: Response): Promise<UserTokens | null> => {
  const result = await getAuthenticator().checkAuthState(req, res);
  return handleAuthResult(result);
};

export const logoutUser = async (req: Request, res: Response) => {
  await getAuthenticator().logout(req, res);
};

export const baseAuthenticator: Pick<Authenticator, 'loginUrl' | 'initialise' | 'configureRoutes' | 'checkAuthState' | 'logout'> = {
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
