import { onMounted, onUnmounted, ref } from "vue";
import { useDialogStore } from "@/store/dialog";
import { useAuthStore } from "@/store/auth";
import { getTokenExpiry, getTokenTtl, isTokenExpired } from "@/utils/auth";
import { verbose } from "@/utils/logger";
import { getTimeSinceLastRequest } from "@/utils/apiClient";

/**
 * Composable to show a dialog when the user has been inactive for too long.
 */
export function useInactivityDialog() {
  const intervalRef = ref();

  const CHECK_INTERVAL = 1000 * 60; // 1 minute
  const INACTIVITY_THRESHOLD = 1000 * 60 * 3; // 3 minutes

  const authStore = useAuthStore();
  const dialogStore = useDialogStore();

  const getTimeUntilExpiry = () => {
    const expiry = getTokenExpiry(authStore.tokens?.accessToken);
    if (expiry === 0) {
      return 0;
    } else {
      return expiry - Date.now();
    }
  };

  const checkExpiry = async () => {
    const timeUntilExpiry = getTimeUntilExpiry();

    if (timeUntilExpiry > 0) {
      const tokenTtl = getTokenTtl(authStore.tokens?.accessToken);
      if (tokenTtl > 0 && timeUntilExpiry <= tokenTtl / 2) {
        if (getTimeSinceLastRequest() < INACTIVITY_THRESHOLD) {
          verbose("User is active; attempting to refresh session");
          try {
            await authStore.refreshSession();
            verbose("Successfully autorefreshed session");
          } catch (e) {
            console.error("Failed to autorefresh session", e);
          }
        }
      }
      return;
    }

    verbose("Auth token expired");
    stopExpiryCheck();

    if (isTokenExpired(authStore.tokens?.refreshToken)) {
      // we cannot refresh the session, so we log out
      dialogStore.push({
        deduplicationId: "session-expired",
        title: "Session Expired",
        subtitle: "You have been logged out due to inactivity.",
        text: "Please log in again to continue.",
        confirmTitle: "OK",
        showCancel: false,
        onDismiss: async () => authStore.logout(),
      });
    } else {
      // we can refresh the session, so we show a dialog
      dialogStore.push({
        deduplicationId: "session-expiring-soon",
        title: "Session Expiring Soon",
        subtitle: "You have been inactive for a while.",
        text: "Do you want to continue your session?",
        confirmTitle: "Stay Logged In",
        cancelTitle: "Logout",
        showCancel: true,
        onDismiss: async (result) => {
          if (result) {
            await authStore.refreshSession();
          } else {
            await authStore.logout();
          }
        },
      });
    }
  };

  const startExpiryCheck = () => {
    intervalRef.value = setInterval(() => new Promise(() => checkExpiry()).catch(console.error), CHECK_INTERVAL);
  };

  const stopExpiryCheck = () => {
    if (intervalRef.value) {
      clearInterval(intervalRef.value);
      intervalRef.value = null;
    }
  };

  const checkSessionExpiration = () => {
    if (authStore.isAuthenticated) {
      if (!intervalRef.value) {
        startExpiryCheck();
      }
    } else {
      if (intervalRef.value) {
        stopExpiryCheck();
      }
    }
  };

  const subscriptions = ref<() => void>();
  onMounted(() => {
    checkSessionExpiration();
    subscriptions.value = authStore.$subscribe(() => {
      checkSessionExpiration();
    });
  });

  onUnmounted(() => {
    subscriptions.value?.();
  });
}
