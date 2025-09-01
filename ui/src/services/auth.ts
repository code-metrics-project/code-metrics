import axios from "../utils/axios";
import { AUTH, CHECK_AUTH_STATE, REFRESH, LOGOUT } from "../utils/urls";
import { logger, verbose } from "@/utils/logger";
import type { Alert } from "@/utils/ui";
import type { AxiosError } from "axios";

export enum LoginResult {
  Success = "Success",
  IncorrectCredentials = "IncorrectCredentials",
  ServerError = "ServerError",
  Unsent = "Unsent",
  LoginRequired = "LoginRequired",
}

export type SecurityTokens = { accessToken: string; refreshToken: string };

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
    const response = await axios.post(AUTH, {
      username,
      password,
    });
    logger("Login successful");
    return {
      result: LoginResult.Success,
      tokens: {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      },
    };
  } catch (e) {
    const error = e as AxiosError;
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
    const response = await axios.post(REFRESH, {
      refreshToken,
    });
    logger("Session refreshed successfully");
    return {
      result: LoginResult.Success,
      tokens: {
        accessToken: response.data.accessToken,
        refreshToken,
      },
    };
  } catch (e) {
    const error = e as AxiosError;
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
  const response = await axios.get(LOGOUT);
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
    verbose("Auth state checker initialised");
  }

  async check(): Promise<LoginResponse> {
    if (this.checking) {
      logger("Auth state check already in progress - awaiting result");
      return await this.checking;
    } else {
      try {
        logger("Starting auth state check");
        this.checking = this.performCheck();
        return await this.checking;
      } finally {
        this.checking = undefined;
        logger("Auth state check completed");
      }
    }
  }

  private async performCheck(): Promise<LoginResponse> {
    try {
      // Example callback:
      // /login/callback?session_state=de8d11a8-2210-4c04-a6ce-37dacb45335f
      // &iss=http%3A%2F%2Flocalhost%3A8086%2Frealms%2Fcodemetrics
      // &code=1df25fe1-8fd6-496d-b67e-bd3e2bbeb4ec.de8d11a8-2210-4c04-a6ce-37dacb45335f.codemetrics
      if (!window.location.search.includes("code=")) {
        logger("No auth code in URL, login required");
        return { result: LoginResult.LoginRequired };
      }

      const checkAuthUrl = `${CHECK_AUTH_STATE}${window.location.search}`;
      const response = await axios.get(checkAuthUrl);
      logger("Auth state check successful");
      return {
        result: LoginResult.Success,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        },
      };
    } catch (e) {
      const error = e as AxiosError;
      const statusString = `${error.response?.status}`;
      if (statusString.startsWith("401")) {
        // receiving 401 from checkAuthState means login failed
        return { result: LoginResult.IncorrectCredentials };
      } else if (statusString.startsWith("5")) {
        return { result: LoginResult.ServerError };
      } else {
        throw error;
      }
    }
  }
}

const authStateChecker = new AuthStateChecker();
