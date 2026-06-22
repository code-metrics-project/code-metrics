import { AuthenticationResult, Authenticator } from "../auth";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { Express, Request, Response } from "express";
import { success } from "../../utils/responses";
import { checkAuthenticated } from "../../routes/authentication";
import { getUiBaseUrl } from "../../utils/server";
import {
  AuthorizationParameters,
  CallbackParamsType,
  Client,
  generators,
  Issuer,
  OpenIDCallbackChecks,
  TokenSet,
} from "openid-client";
import { readEncryptedCookie, writeEncryptedCookie } from "../../utils/cookies";
import { SecureRouter } from "../../routes/router";
import { getEnvConfigItem } from "../../config/sources/source";

const OIDC_ISSUER_BASE_URL = getEnvConfigItem("OIDC_ISSUER_BASE_URL");
const OIDC_CLIENT_ID = getEnvConfigItem("OIDC_CLIENT_ID");
const OIDC_CLIENT_SECRET: string = getEnvConfigItem("OIDC_CLIENT_SECRET", "");
const OIDC_USER_CLAIM: string = getEnvConfigItem("OIDC_USER_CLAIM", "sub");
const OIDC_SCOPES: string = getEnvConfigItem("OIDC_SCOPES", "openid email");
const OIDC_AUDIENCE: string | null = getEnvConfigItem("OIDC_AUDIENCE");
const OIDC_USE_PKCE: boolean = getEnvConfigItem("OIDC_USE_PKCE") === "true";
const OIDC_REDIRECT_URI: string | null = getEnvConfigItem("OIDC_REDIRECT_URI");

const AUTH_PATH = "/api/oidc/auth";
const REDIRECT_URI_PATH = "/login/callback";
const SESSION_COOKIE_NAME = "codemetrics.session";
const INITIAL_SESSION_COOKIE_EXPIRY = 1000 * 60 * 10; // 10 minutes

type SessionCookie = {
  codeVerifier?: string;
  userId?: string;
};

export const getOidcAuthenticator = (): Authenticator => {
  return { loginUrl: AUTH_PATH, initialise, configureRoutes, checkAuthState, authenticateUser, logout };
};

let client: Client | null = null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const initialise = async (app: Express) => Promise.resolve();

const configureRoutes = (router: SecureRouter) => {
  router.addUnauthenticatedRoute("get", "/api/authenticated", discover, checkAuthenticated);
  router.addUnauthenticatedRoute("get", AUTH_PATH, discover, redirectToAuthz);
};

const determineRedirectUri = (): URL => {
  let redirectUri: URL;
  if (OIDC_REDIRECT_URI) {
    redirectUri = new URL(OIDC_REDIRECT_URI);
  } else {
    redirectUri = new URL(`${getUiBaseUrl()}${REDIRECT_URI_PATH}`);
  }
  verbose("Determined redirect URI", redirectUri.toString());
  return redirectUri;
};

const discover = async (req: Request, res: Response, next: () => void) => {
  if (client) {
    verbose("OIDC client already discovered");
  } else {
    verbose("Discovering OIDC issuer from", OIDC_ISSUER_BASE_URL);
    let issuer: Issuer;
    try {
      issuer = await Issuer.discover(OIDC_ISSUER_BASE_URL);
    } catch (e) {
      throw new Error(`Error discovering OIDC issuer: ${e}`);
    }
    verbose(`Discovered OIDC issuer`, issuer.metadata);

    const redirectUri = determineRedirectUri();

    client = new issuer.Client({
      client_id: OIDC_CLIENT_ID,
      client_secret: OIDC_CLIENT_SECRET,
      redirect_uris: [redirectUri.toString()],
      response_types: ["code"],
    });
  }
  next();
};

const redirectToAuthz = async (req: Request, res: Response): Promise<void> => {
  verbose("Building authorization URL");
  const redirectUri = determineRedirectUri();

  const authzParams: AuthorizationParameters = {
    redirect_uri: redirectUri.toString(),
    scope: OIDC_SCOPES,
    audience: OIDC_AUDIENCE,
  };

  if (OIDC_USE_PKCE) {
    verbose("Using PKCE for authorization flow");
    const codeVerifier = generators.codeVerifier();
    authzParams.code_challenge = generators.codeChallenge(codeVerifier);
    authzParams.code_challenge_method = "S256";
    writeSessionCookie(res, { codeVerifier }, new Date(Date.now() + INITIAL_SESSION_COOKIE_EXPIRY));
  } else {
    verbose("Not using PKCE for authorization flow");
  }

  const authorizationUrl = client.authorizationUrl(authzParams);
  logger("Redirecting to authorization URL", authorizationUrl);
  res.redirect(authorizationUrl);
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const checkAuthState = async (req: Request, res: Response): Promise<AuthenticationResult> => {
  const userId = await handleCallback(req);
  if (userId) {
    logger(`OIDC authentication succeeded with user ID: ${userId}`);
    return { success: true, user: { name: userId } };
  }
  logger(`OIDC authentication failed; no user ID set in session`);
  return { success: false };
};

const handleCallback = async (req: Request): Promise<string> => {
  const params = client.callbackParams(req);
  verbose("Received OIDC callback, with params", params);

  const tokenSet = await performTokenExchange(req, params);
  if (!tokenSet) {
    warn("OIDC: Token exchange failed or returned null");
    return null;
  }

  const userId = tokenSet.claims()[OIDC_USER_CLAIM]?.toString();
  if (userId) {
    logger(`OIDC user ${userId} authenticated`);
    return userId;
  } else {
    warn(`No user ID found in ID token claims named ${OIDC_USER_CLAIM}`);
    return null;
  }
};

const performTokenExchange = async (req: Request, params: CallbackParamsType): Promise<TokenSet | null> => {
  logger(`Performing token exchange`);

  const checks: OpenIDCallbackChecks = {};

  if (OIDC_USE_PKCE) {
    verbose("Attempting to validate PKCE code challenge");
    const sessionCookie = readSessionCookie(req);
    if (!sessionCookie) {
      warn(`No session cookie found - cannot perform PKCE checks`);
      return null;
    }
    if (!sessionCookie.codeVerifier) {
      warn(`No PKCE code verifier found in session cookie - cannot perform PKCE checks`);
      return null;
    }
    checks.code_verifier = sessionCookie.codeVerifier;
  } else {
    verbose("Not using PKCE - skipping PKCE checks");
  }

  const redirectUri = determineRedirectUri();

  try {
    const tokenSet = await client.callback(redirectUri.toString(), params, checks);
    verbose("Received and validated tokens", tokenSet);
    verbose("Validated ID Token claims", tokenSet.claims());
    return tokenSet;
  } catch (e) {
    warn(`Error exchanging tokens: ${e}`);
    return null;
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const authenticateUser = async (username: string, password: string): Promise<AuthenticationResult> => {
  warn(`This implementation does not support direct user authentication.`);
  return { success: false };
};

const logout = async (req: Request, res: Response): Promise<void> => {
  if (OIDC_USE_PKCE) {
    verbose(`Clearing session cookie: ${SESSION_COOKIE_NAME}`);
    res.clearCookie(SESSION_COOKIE_NAME);
  }
  success(res, {});
};

const writeSessionCookie = (res: Response, sessionCookie: SessionCookie, expires: Date): void => {
  writeEncryptedCookie(res, SESSION_COOKIE_NAME, sessionCookie, OIDC_CLIENT_ID, { expires });
};

const readSessionCookie = (req: Request): SessionCookie | null => {
  return readEncryptedCookie<SessionCookie>(req, SESSION_COOKIE_NAME, OIDC_CLIENT_ID);
};

export const testables = {
  determineRedirectUri,
};
