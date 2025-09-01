import { defineStore } from "pinia";
import {
  checkAuthState,
  login,
  type LoginResponse,
  LoginResult,
  logout,
  refreshSession,
  type SecurityTokens,
} from "@/services/auth";
import { Paths } from "@/router/paths";
import { logger } from "@/utils/logger";
import { getBootstrap, getConfig } from "@/utils/config";
import { getSessionHolder } from "@/utils/session";
import type { RouteLocation, RouteLocationPathRaw, Router } from "vue-router";
import { isTokenExpired } from "@/utils/auth";

type AuthState = {
  tokens?: SecurityTokens;
  status: LoginResult;
};

type LoginDetails = {
  username: string;
  password: string;
};

const ACCESS_TOKEN_KEY = "cm-session";
const REFRESH_TOKEN_KEY = "cm-refresh";
const POST_LOGIN_DEST_KEY = "cm-post-login-dest";

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => {
    const session = getSessionHolder();
    const accessToken = session.get(ACCESS_TOKEN_KEY);
    const refreshToken = session.get(REFRESH_TOKEN_KEY);

    let tokens: SecurityTokens | undefined;
    if (accessToken && refreshToken) {
      tokens = { accessToken, refreshToken };
    } else {
      tokens = undefined;
    }
    return { tokens, status: LoginResult.Unsent };
  },

  actions: {
    async checkAuthState() {
      logger("Checking auth state");
      try {
        const conclusion = await checkAuthState();
        this.processAuthResponse(conclusion);
      } catch (e: any) {
        throw new Error(e);
      }
    },

    rememberDestination(destination: RouteLocation) {
      const routeLocation = destination as RouteLocationPathRaw;
      if (routeLocation.path) {
        const { path, query } = routeLocation;

        // destination is stored in sessionStorage *not* the sessionHolder,
        // as it is unique per-tab.
        sessionStorage.setItem(POST_LOGIN_DEST_KEY, JSON.stringify({ path, query }));
      } else {
        sessionStorage.removeItem(POST_LOGIN_DEST_KEY);
      }
    },

    async login({ username, password }: LoginDetails) {
      try {
        const conclusion = await login(username, password);
        this.processAuthResponse(conclusion);
      } catch (e: any) {
        throw new Error(e);
      }
    },

    processAuthResponse(conclusion: LoginResponse) {
      switch (conclusion.result) {
        case LoginResult.Success: {
          const tokens = conclusion.tokens;
          const session = getSessionHolder();
          session.set(ACCESS_TOKEN_KEY, tokens.accessToken);
          session.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
          this.tokens = tokens;
          break;
        }
        case LoginResult.LoginRequired: {
          if (this.isExternalLogin) {
            const loginUrl = getBootstrap().auth.loginUrl!;
            const fullLoginUrl = loginUrl.startsWith("/") ? getConfig().webConfig.apiBaseUrl + loginUrl : loginUrl;

            logger("Redirecting to login page", fullLoginUrl);
            window.location.href = fullLoginUrl;
          }
          break;
        }
        default: {
          if (this.isExternalLogin) {
            logger(`Login result: ${conclusion.result} - redirecting to logout page`);
            window.location.href = `${Paths.Logout}?error=${conclusion.result}`;
          }
          break;
        }
      }
      this.status = conclusion.result;
    },

    fetchAndClearDestination(router: Router): RouteLocation | string {
      const destination = sessionStorage.getItem(POST_LOGIN_DEST_KEY);
      sessionStorage.removeItem(POST_LOGIN_DEST_KEY);

      if (destination) {
        try {
          const { path, query } = JSON.parse(destination);
          const knownPaths = router.getRoutes().map((r) => r.path);
          if (!knownPaths.includes(path)) {
            console.warn("[Router] Unknown destination path:", path);
            return Paths.Home;
          }

          return router.resolve({ path, query });
        } catch (e) {
          console.warn(`Error routing to previous destination: ${destination}`, e);
        }
      }
      return Paths.Home;
    },

    async refreshSession() {
      logger("Refreshing session");
      const refreshToken = getSessionHolder().get(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error("No refresh token found in session storage");
      }
      try {
        const conclusion = await refreshSession(refreshToken);
        this.processAuthResponse(conclusion);
      } catch (e: any) {
        throw new Error(e);
      }
    },

    async logout() {
      try {
        await logout();
        const session = getSessionHolder();
        session.remove(ACCESS_TOKEN_KEY);
        session.remove(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(POST_LOGIN_DEST_KEY);
        // Force refresh on logout to mitigate any state issues.
        window.location.href = `${window.location.origin}${Paths.Logout}`;
      } catch (e: any) {
        throw new Error(e);
      }
    },
  },

  getters: {
    isAuthenticated: (state): boolean => {
      return !!state.tokens && !isTokenExpired(state.tokens.accessToken);
    },
    isExternalLogin: (): boolean => {
      return !!getBootstrap().auth.loginUrl;
    },
  },
});
