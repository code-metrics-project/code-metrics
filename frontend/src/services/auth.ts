import client, { type HttpError } from "@/api/client";
import { AUTH, CHECK_AUTH_STATE, REFRESH, LOGOUT } from "@/api/endpoints";
import { logger, verbose } from "@/utils/logger";
import type { Alert } from "@/utils/ui";

export enum LoginResult {
  Success = "Success",
  IncorrectCredentials = "IncorrectCredentials",
  ServerError = "ServerError",
  Unsent = "Unsent",
  LoginRequired = "LoginRequired",
}

export interface SecurityTokens {
  accessToken: string;
  refreshToken: string;
}

export type LoginResponse =
  | {
      result: LoginResult.Success;
      tokens: SecurityTokens;
    }
  | {
      result: LoginResult.IncorrectCredentials | LoginResult.ServerError | LoginResult.LoginRequired;
    };

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const response = await client.post<{ accessToken: string; refreshToken: string }>(AUTH, {
      username,
      password,
    });
    logger("[Auth] Login successful");
    return {
      result: LoginResult.Success,
      tokens: {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      },
    };
  } catch (e) {
    const error = e as HttpError;
    const statusString = `${error.response?.status}`;
    if (statusString.startsWith("401")) {
      return { result: LoginResult.IncorrectCredentials };
    } else if (statusString.startsWith("5")) {
      return { result: LoginResult.ServerError };
    } else {
      throw error;
    }
  }
}

export const checkAuthState = () => authStateChecker.check();

export const refreshSession = async (refreshToken: string): Promise<LoginResponse> => {
  try {
    const response = await client.post<{ accessToken: string }>(REFRESH, {
      refreshToken,
    });
    logger("[Auth] Session refreshed successfully");
    return {
      result: LoginResult.Success,
      tokens: {
        accessToken: response.data.accessToken,
        refreshToken,
      },
    };
  } catch (e) {
    const error = e as HttpError;
    const statusString = `${error.response?.status}`;
    if (statusString.startsWith("401")) {
      return { result: LoginResult.IncorrectCredentials };
    } else if (statusString.startsWith("5")) {
      return { result: LoginResult.ServerError };
    } else {
      throw error;
    }
  }
};

export async function logout() {
  const response = await client.get(LOGOUT);
  return response.data;
}

/**
 * Convert a login result to an error message.
 * @param error
 */
export function getErrorMessage(error: LoginResult | string | null): Alert | null {
  const result = typeof error === "string" ? LoginResult[error as keyof typeof LoginResult] : error;

  let message: string | null;
  switch (result) {
    case LoginResult.IncorrectCredentials:
      message = "Invalid credentials";
      break;
    case LoginResult.ServerError:
      message = "Server error, please try again later";
      break;
    case LoginResult.Success:
    case LoginResult.LoginRequired:
    default:
      message = null;
      break;
  }
  if (message) {
    return { type: "error", message };
  } else {
    return null;
  }
}

/**
 * AuthStateChecker is a utility class to check the authentication state.
 * For methods such as OIDC, this triggers the backend token exchange.
 *
 * IMPORTANT: This MUST be used as a singleton instance.
 * This avoids multiple requests to the server, which in the case of OIDC
 * can cause failures when the auth code is reused.
 */
class AuthStateChecker {
  private checking: Promise<LoginResponse> | undefined;

  constructor() {
    verbose("[Auth] Auth state checker initialised");
  }

  async check(): Promise<LoginResponse> {
    if (this.checking) {
      logger("[Auth] Auth state check already in progress - awaiting result");
      return await this.checking;
    } else {
      try {
        logger("[Auth] Starting auth state check");
        this.checking = this.performCheck();
        return await this.checking;
      } finally {
        this.checking = undefined;
        logger("[Auth] Auth state check completed");
      }
    }
  }

  private async performCheck(): Promise<LoginResponse> {
    try {
      // Example callback:
      // /login/callback?session_state=de8d11a8-2210-4c04-a6ce-37dacb45335f
      // &iss=http%3A%2F%2Flocalhost%3A8086%2Frealms%2Fcodemetrics
      // &code=1df25fe1-8fd6-496d-b67e-bd3e2bbeb4ec.de8d11a8-2210-4c04-a6ce-37dacb45335f.codemetrics
      //
      // For OIDC, we need to pass the code parameter to the backend
      const checkAuthUrl = `${CHECK_AUTH_STATE}${window.location.search}`;
      const response = await client.get<{ accessToken?: string; refreshToken?: string }>(checkAuthUrl);
      if (response.data?.accessToken) {
        return {
          result: LoginResult.Success,
          tokens: {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken || "",
          },
        };
      }
      return { result: LoginResult.LoginRequired };
    } catch (e) {
      const error = e as HttpError;
      const statusString = `${error.response?.status}`;
      if (statusString.startsWith("401")) {
        return { result: LoginResult.LoginRequired };
      } else if (statusString.startsWith("5")) {
        return { result: LoginResult.ServerError };
      } else {
        throw error;
      }
    }
  }
}

const authStateChecker = new AuthStateChecker();
