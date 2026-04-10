import { useEffect, useRef, useCallback } from "react";
import { useDialogStore } from "@/store/dialog";
import { useAuthStore } from "@/store/auth";
import { getTokenExpiry, getTokenTtl, isTokenExpired } from "@/utils/auth";
import { logger } from "@/utils/logger";
import { getTimeSinceLastRequest } from "@/api/client";
import { useI18n } from "@/hooks/useI18n";

const CHECK_INTERVAL = 1000 * 60; // 1 minute
const INACTIVITY_THRESHOLD = 1000 * 60 * 3; // 3 minutes

/**
 * Hook to periodically check for session expiry and show appropriate dialogs.
 * Should be used once at the app root level.
 */
export function useSessionExpiryChecker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { t } = useI18n();
  const tokens = useAuthStore((state) => state.tokens);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const logout = useAuthStore((state) => state.logout);
  const pushDialog = useDialogStore((state) => state.push);

  const stopExpiryCheck = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const getTimeUntilExpiry = useCallback(() => {
    const expiry = getTokenExpiry(tokens?.accessToken);
    if (expiry === 0) {
      return 0;
    }
    return expiry - Date.now();
  }, [tokens?.accessToken]);

  const checkExpiry = useCallback(async () => {
    const timeUntilExpiry = getTimeUntilExpiry();

    if (timeUntilExpiry > 0) {
      const tokenTtl = getTokenTtl(tokens?.accessToken);
      if (tokenTtl > 0 && timeUntilExpiry <= tokenTtl / 2) {
        // Token is about to expire (less than half TTL remaining)
        // If user has been active recently, try to refresh
        if (getTimeSinceLastRequest() < INACTIVITY_THRESHOLD) {
          logger("User is active; attempting to refresh session");
          try {
            await refreshSession();
            logger("Successfully autorefreshed session");
          } catch (e) {
            console.error("Failed to autorefresh session", e);
          }
        }
      }
      return;
    }

    // Token has expired
    logger("Auth token expired");
    stopExpiryCheck();

    if (isTokenExpired(tokens?.refreshToken)) {
      // Cannot refresh the session, force logout
      pushDialog({
        deduplicationId: "session-expired",
        title: t("pages:session.expired.title"),
        subtitle: t("pages:session.expired.subtitle"),
        text: t("pages:session.expired.text"),
        confirmTitle: t("pages:session.expired.confirm"),
        showCancel: false,
        onDismiss: async () => {
          await logout();
        },
      });
    } else {
      // Can still refresh, ask user
      pushDialog({
        deduplicationId: "session-expiring-soon",
        title: t("pages:session.expiringSoon.title"),
        subtitle: t("pages:session.expiringSoon.subtitle"),
        text: t("pages:session.expiringSoon.text"),
        confirmTitle: t("pages:session.expiringSoon.confirm"),
        cancelTitle: t("pages:session.expiringSoon.cancel"),
        showCancel: true,
        onDismiss: async (result) => {
          if (result) {
            await refreshSession();
          } else {
            await logout();
          }
        },
      });
    }
  }, [
    tokens?.accessToken,
    tokens?.refreshToken,
    getTimeUntilExpiry,
    refreshSession,
    logout,
    pushDialog,
    stopExpiryCheck,
    t,
  ]);

  const startExpiryCheck = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      checkExpiry().catch(console.error);
    }, CHECK_INTERVAL);
  }, [checkExpiry]);

  useEffect(() => {
    if (isAuthenticated) {
      // Run an immediate check when the hook mounts or auth state changes
      checkExpiry().catch(console.error);
      startExpiryCheck();
    } else {
      stopExpiryCheck();
    }

    return () => {
      stopExpiryCheck();
    };
  }, [isAuthenticated, checkExpiry, startExpiryCheck, stopExpiryCheck]);
}
