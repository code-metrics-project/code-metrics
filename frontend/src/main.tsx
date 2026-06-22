import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "@/components/ui/sonner";
import { DialogQueue } from "@/components/DialogQueue";
import { BootstrapLoader } from "@/components/BootstrapLoader";
import { router } from "@/router";
import { initThemeWatcher } from "@/store/theme";
import { fetchWebConfig, fetchSystemBootstrap } from "@/config";
import { setApiBaseUrl } from "@/api/client";
import { AppUnavailable } from "@/AppUnavailable";
import i18n from "@/i18n";
import "./index.css";

// Initialize theme watcher for system preference changes and persistence
initThemeWatcher();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const loadingTimeoutMs =
  Number((window as Window & { __CM_LOADING_TIMEOUT_MS__?: number }).__CM_LOADING_TIMEOUT_MS__) || 30000;

function BootstrapApp() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let isActive = true;

    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setTimedOut(true);
      }
    }, loadingTimeoutMs);

    const initialize = async () => {
      try {
        const webConfig = await fetchWebConfig();
        setApiBaseUrl(webConfig.apiBaseUrl);
        const bootstrap = await fetchSystemBootstrap();

        // Check license before proceeding
        if (!bootstrap.isLicensed && window.location.pathname !== "/license/error") {
          window.location.href = "/license/error";
          return;
        }

        // Check config before proceeding
        if (!bootstrap.hasConfig && window.location.pathname !== "/config/error") {
          window.location.href = "/config/error";
          return;
        }

        if (isActive) {
          setStatus("ready");
        }
      } catch (e) {
        console.error("[init] Failed to initialize config", e);
        if (isActive) {
          setStatus("error");
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    initialize();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (status === "error") {
    return <AppUnavailable />;
  }

  if (status !== "ready") {
    return <BootstrapLoader timedOut={timedOut} />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
        <DialogQueue />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BootstrapApp />
  </StrictMode>
);
