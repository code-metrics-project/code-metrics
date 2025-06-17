import { getBootstrap } from "@/utils/config";
import { logger } from "@/utils/logger";

type AuthSessionHolder = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

let sessionHolder: AuthSessionHolder;

export const getSessionHolder = (): AuthSessionHolder => {
  if (!sessionHolder) {
    const sessionStoreMethod = getBootstrap().auth.store;
    logger(`Session store method: ${sessionStoreMethod}`);

    switch (sessionStoreMethod) {
      case "cookie": {
        sessionHolder = {
          get: (key: string) => {
            const cookies = document.cookie.split("; ");
            for (const cookie of cookies) {
              const [cookieKey, cookieValue] = cookie.split("=");
              if (cookieKey === key) {
                return cookieValue;
              }
            }
            return null;
          },
          set: (key: string, value: string) => {
            document.cookie = `${key}=${value}; path=/`;
          },
          remove: (key: string) => {
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          },
        };
        break;
      }

      case "sessionstorage": {
        sessionHolder = {
          get: (key: string) => sessionStorage.getItem(key),
          set: (key: string, value: string) =>
            sessionStorage.setItem(key, value),
          remove: (key: string) => sessionStorage.removeItem(key),
        };
        break;
      }

      default:
        throw new Error(`Unknown session store method: ${sessionStoreMethod}`);
    }
  }
  return sessionHolder;
};
