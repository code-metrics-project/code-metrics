import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  checkAuthState,
  login as loginService,
  type LoginResponse,
  LoginResult,
  logout as logoutService,
  refreshSession as refreshSessionService,
  type SecurityTokens,
} from "@/services/auth";
import { Paths } from "@/router/paths";
import { logger } from "@/utils/logger";
import { getBootstrap, getConfig } from "@/config";
import { getSessionHolder } from "@/services/session";

interface AuthState {
  tokens?: SecurityTokens;
  status: LoginResult;
  isAuthenticated: boolean;
  isExternalLogin: boolean;
}

interface AuthActions {
  checkAuthState: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  processAuthResponse: (conclusion: LoginResponse) => void;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  rememberDestination: (path: string, query?: Record<string, string>) => void;
  fetchAndClearDestination: () => { path: string; query?: Record<string, string> } | null;
}

const ACCESS_TOKEN_KEY = "cm-session";
const REFRESH_TOKEN_KEY = "cm-refresh";
const POST_LOGIN_DEST_KEY = "cm-post-login-dest";

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      tokens: undefined,
      status: LoginResult.Unsent,
      isAuthenticated: false,
      isExternalLogin: false,

      checkAuthState: async () => {
        logger("Checking auth state");
        try {
          const conclusion = await checkAuthState();
          get().processAuthResponse(conclusion);
        } catch (e) {
          throw new Error(String(e));
        }
      },

      rememberDestination: (path: string, query?: Record<string, string>) => {
        // destination is stored in sessionStorage *not* the sessionHolder,
        // as it is unique per-tab.
        sessionStorage.setItem(POST_LOGIN_DEST_KEY, JSON.stringify({ path, query }));
      },

      fetchAndClearDestination: () => {
        const destination = sessionStorage.getItem(POST_LOGIN_DEST_KEY);
        sessionStorage.removeItem(POST_LOGIN_DEST_KEY);

        if (destination) {
          try {
            return JSON.parse(destination);
          } catch {
            console.warn(`Error parsing destination: ${destination}`);
          }
        }
        return null;
      },

      login: async (username: string, password: string): Promise<boolean> => {
        try {
          const conclusion = await loginService(username, password);
          get().processAuthResponse(conclusion);
          return conclusion.result === LoginResult.Success;
        } catch (e) {
          throw new Error(String(e));
        }
      },

      processAuthResponse: (conclusion: LoginResponse) => {
        switch (conclusion.result) {
          case LoginResult.Success: {
            const tokens = conclusion.tokens;
            const session = getSessionHolder();
            session.set(ACCESS_TOKEN_KEY, tokens.accessToken);
            session.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
            set({
              tokens,
              status: LoginResult.Success,
              isAuthenticated: true,
            });
            break;
          }
          case LoginResult.LoginRequired: {
            const bootstrap = getBootstrap();
            if (bootstrap?.auth?.loginUrl) {
              const loginUrl = bootstrap.auth.loginUrl;
              const fullLoginUrl = loginUrl.startsWith("/") ? getConfig().webConfig.apiBaseUrl + loginUrl : loginUrl;

              logger("Redirecting to login page", fullLoginUrl);
              window.location.href = fullLoginUrl;
            }
            set({ status: LoginResult.LoginRequired, isExternalLogin: true });
            break;
          }
          default: {
            const bootstrap = getBootstrap();
            if (bootstrap?.auth?.loginUrl) {
              logger(`Login result: ${conclusion.result} - redirecting to logout page`);
              window.location.href = `${Paths.Logout}?error=${conclusion.result}`;
            }
            set({ status: conclusion.result });
            break;
          }
        }
      },

      refreshSession: async () => {
        logger("Refreshing session");
        const refreshToken = getSessionHolder().get(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          throw new Error("No refresh token found in session storage");
        }
        try {
          const conclusion = await refreshSessionService(refreshToken);
          get().processAuthResponse(conclusion);
        } catch (e) {
          throw new Error(String(e));
        }
      },

      logout: async () => {
        try {
          await logoutService();
          const session = getSessionHolder();
          session.remove(ACCESS_TOKEN_KEY);
          session.remove(REFRESH_TOKEN_KEY);
          set({
            tokens: undefined,
            status: LoginResult.Unsent,
            isAuthenticated: false,
          });

          // Redirect to login page after logout
          window.location.href = Paths.Login;
        } catch (e) {
          console.error("Logout failed", e);
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
