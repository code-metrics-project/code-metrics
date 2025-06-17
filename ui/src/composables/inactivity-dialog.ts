import { onMounted, onUnmounted, ref } from "vue";
import { useDialogStore } from "@/store/dialog";
import { useAuthStore } from "@/store/auth";
import { getTokenExpiry } from "@/utils/auth";
import { verbose } from "@/utils/logger";

/**
 * Composable to show a dialog when the user has been inactive for too long.
 */
export function useInactivityDialog() {
  const intervalRef = ref();

  const CHECK_INTERVAL = 1000 * 60; // 1 minute

  const authStore = useAuthStore();
  const dialogStore = useDialogStore();

  const getTimeUntilExpiry = () => {
    const expiry = getTokenExpiry(authStore.accessToken);
    if (expiry === 0) {
      return 0;
    } else {
      return expiry - Date.now();
    }
  };

  const checkExpiry = () => {
    if (getTimeUntilExpiry() > CHECK_INTERVAL) {
      return;
    }

    verbose("Session expired due to inactivity");
    stopExpiryCheck();

    dialogStore.push({
      title: "Session Expired",
      subtitle: "You have been logged out due to inactivity.",
      text: "Please log in again to continue.",
      confirmTitle: "OK",
      showCancel: false,
      onDismiss: (result) => {
        if (result) {
          authStore.logout();
        }
      },
    });
  };

  const startExpiryCheck = () => {
    intervalRef.value = setInterval(checkExpiry, CHECK_INTERVAL);
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
