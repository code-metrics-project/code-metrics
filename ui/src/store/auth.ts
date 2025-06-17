import { defineStore } from "pinia";
import { checkAuthState, login, type LoginResponse, LoginResult, logout } from "@/services/auth";
import { Paths } from "@/router/paths";
import { logger } from "@/utils/logger";
import { getBootstrap, getConfig } from "@/utils/config";
import { getSessionHolder } from "@/utils/session";
import type { RouteLocation, RouteLocationPathRaw, Router } from "vue-router";
import { isTokenExpired } from "@/utils/auth";

type AuthState = {
  accessToken: string | undefined;
  status: LoginResult;
};

type LoginDetails = {
  username: string;
  password: string;
};

const SESSION_STORAGE_KEY = "cm-session";
const POST_LOGIN_DEST_KEY = "cm-post-login-dest";

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    accessToken: getSessionHolder().get(SESSION_STORAGE_KEY) ?? undefined,
    status: LoginResult.Unsent,
  }),

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
        case LoginResult.Success:
          this.accessToken = conclusion.accessToken;
          getSessionHolder().set(SESSION_STORAGE_KEY, conclusion.accessToken);
          break;

        case LoginResult.LoginRequired:
          if (this.isExternalLogin) {
            const loginUrl = getBootstrap().auth.loginUrl!!;
            const fullLoginUrl = loginUrl.startsWith("/") ? getConfig().webConfig.apiBaseUrl + loginUrl : loginUrl;

            logger("Redirecting to login page", fullLoginUrl);
            window.location.href = fullLoginUrl;
          }
          break;

        default:
          if (this.isExternalLogin) {
            logger(`Login result: ${conclusion.result} - redirecting to logout page`);
            window.location.href = `${Paths.Logout}?error=${conclusion.result}`;
          }
          break;
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

    async logout() {
      try {
        await logout();
        getSessionHolder().remove(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(POST_LOGIN_DEST_KEY);
        // Force refresh on logout to mitigate any state issues.
        window.location.href = `${window.location.origin}${Paths.Logout}`;
      } catch (e: any) {
        throw new Error(e);
      }
    },
  },

  getters: {
    isAuthenticated: (state) => {
      return !!state.accessToken && !isTokenExpired(state.accessToken);
    },
    isExternalLogin: () => {
      return !!getBootstrap().auth.loginUrl;
    },
  },
});
