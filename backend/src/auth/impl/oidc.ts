import { AuthenticationResult, Authenticator } from "../auth";
import { logger, verbose, warn } from "../../utils/logger/logger";
import { Express, Request, Response } from "express";
import { success } from "../../utils/responses";
import { checkAuthenticated } from "../../routes/authentication";
import { getUiBaseUrl } from "../../utils/server";
import type { AuthorizationCodeGrantChecks, Configuration, TokenEndpointResponse, TokenEndpointResponseHelpers } from "openid-client";
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

type OidcClientModule = typeof import("openid-client");

let client: Configuration | null = null;

const loadOidcClient = async (): Promise<OidcClientModule> => import("openid-client");

const getConfiguredIssuerBaseUrl = (): string => OIDC_ISSUER_BASE_URL!;

const getConfiguredClientId = (): string => OIDC_CLIENT_ID!;

const getDiscoveredClient = (): Configuration => client!;

const isLocalInsecureIssuer = (issuerBaseUrl: URL): boolean => {
  if (issuerBaseUrl.protocol !== "http:") {
    return false;
  }

  return ["localhost", "127.0.0.1", "::1"].includes(issuerBaseUrl.hostname);
};

const getDiscoveryExecuteHooks = (issuerBaseUrl: URL, oidcClient: OidcClientModule) => {
  if (!isLocalInsecureIssuer(issuerBaseUrl)) {
    return undefined;
  }

  warn(`OIDC issuer ${issuerBaseUrl.origin} is using HTTP; allowing insecure requests for local development only.`);
  return [oidcClient.allowInsecureRequests];
};

const getTokenEndpointParameters = (): Record<string, string> => {
  return {
    redirect_uri: determineRedirectUri().toString(),
  };
};

const initialise = async (_app: Express) => Promise.resolve();

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
    verbose("Discovering OIDC issuer from", getConfiguredIssuerBaseUrl());
    const oidcClient = await loadOidcClient();
    const issuerBaseUrl = new URL(getConfiguredIssuerBaseUrl());
    try {
      client = await oidcClient.discovery(
        issuerBaseUrl,
        getConfiguredClientId(),
        {
        ...(OIDC_CLIENT_SECRET ? { client_secret: OIDC_CLIENT_SECRET } : {}),
        redirect_uris: [determineRedirectUri().toString()],
        response_types: ["code"],
        },
        undefined,
        { execute: getDiscoveryExecuteHooks(issuerBaseUrl, oidcClient) },
      );
    } catch (e) {
      throw new Error(`Error discovering OIDC issuer: ${e}`, { cause: e });
    }
    verbose("Discovered OIDC issuer", client.serverMetadata());

    const redirectUri = determineRedirectUri();
    verbose("Using OIDC redirect URI", redirectUri.toString());
  }
  next();
};

const redirectToAuthz = async (req: Request, res: Response): Promise<void> => {
  verbose("Building authorization URL");
  const redirectUri = determineRedirectUri();
  const oidcClient = await loadOidcClient();

  const authzParams: Record<string, string> = {
    redirect_uri: redirectUri.toString(),
    scope: OIDC_SCOPES,
  };

  if (OIDC_AUDIENCE) {
    authzParams.audience = OIDC_AUDIENCE;
  }

  if (OIDC_USE_PKCE) {
    verbose("Using PKCE for authorization flow");
    const codeVerifier = oidcClient.randomPKCECodeVerifier();
    authzParams.code_challenge = await oidcClient.calculatePKCECodeChallenge(codeVerifier);
    authzParams.code_challenge_method = "S256";
    writeSessionCookie(res, { codeVerifier }, new Date(Date.now() + INITIAL_SESSION_COOKIE_EXPIRY));
  } else {
    verbose("Not using PKCE for authorization flow");
  }

  const authorizationUrl = oidcClient.buildAuthorizationUrl(getDiscoveredClient(), authzParams);
  logger("Redirecting to authorization URL", authorizationUrl.toString());
  res.redirect(authorizationUrl.toString());
};

const checkAuthState = async (req: Request, _res: Response): Promise<AuthenticationResult> => {
  const userId = await handleCallback(req);
  if (userId) {
    logger(`OIDC authentication succeeded with user ID: ${userId}`);
    return { success: true, user: { name: userId } };
  }
  logger(`OIDC authentication failed; no user ID set in session`);
  return { success: false };
};

const handleCallback = async (req: Request): Promise<string | null> => {
  verbose("Received OIDC callback", req.originalUrl || req.url);

  const tokenSet = await performTokenExchange(req);
  if (!tokenSet) {
    warn("OIDC: Token exchange failed or returned null");
    return null;
  }

  const userId = tokenSet.claims()?.[OIDC_USER_CLAIM!]?.toString();
  if (userId) {
    logger(`OIDC user ${userId} authenticated`);
    return userId;
  } else {
    warn(`No user ID found in ID token claims named ${OIDC_USER_CLAIM}`);
    return null;
  }
};

const performTokenExchange = async (
  req: Request,
): Promise<(TokenEndpointResponse & TokenEndpointResponseHelpers) | null> => {
  logger(`Performing token exchange`);
  const checks: AuthorizationCodeGrantChecks = {};
  const oidcClient = await loadOidcClient();

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
    checks.pkceCodeVerifier = sessionCookie.codeVerifier;
  } else {
    verbose("Not using PKCE - skipping PKCE checks");
  }

  try {
    const discoveredClient = getDiscoveredClient();
    const tokenSet = await oidcClient.authorizationCodeGrant(
      discoveredClient,
      getCurrentCallbackUrl(req),
      checks,
      getTokenEndpointParameters(),
    );
    verbose("Received and validated tokens", tokenSet);
    verbose("Validated ID Token claims", tokenSet.claims());
    return tokenSet;
  } catch (e) {
    warn(`Error exchanging tokens: ${e}`);
    return null;
  }
};

const getCurrentCallbackUrl = (req: Request): URL => {
  const authResponseUrl = new URL(req.originalUrl || req.url, getUiBaseUrl());
  const callbackUrl = determineRedirectUri();
  callbackUrl.search = authResponseUrl.search;
  return callbackUrl;
};

const authenticateUser = async (_username: string, _password: string): Promise<AuthenticationResult> => {
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
  writeEncryptedCookie(res, SESSION_COOKIE_NAME, sessionCookie, getConfiguredClientId(), { expires });
};

const readSessionCookie = (req: Request): SessionCookie | null => {
  return readEncryptedCookie<SessionCookie>(req, SESSION_COOKIE_NAME, getConfiguredClientId());
};

export const testables = {
  determineRedirectUri,
  isLocalInsecureIssuer,
  getDiscoveryExecuteHooks,
  getTokenEndpointParameters,
  getCurrentCallbackUrl,
};
