import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchWebConfig, fetchSystemBootstrap, fetchSystemConfig } from "@/config";
import { setApiBaseUrl } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { Paths } from "@/router/paths";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSessionExpiryChecker } from "@/hooks/useSessionExpiryChecker";
import { useConfigChangeDetector } from "@/hooks/useConfigChangeDetector";
import { ConfigChangeBanner } from "@/components/ConfigChangeBanner";
import type { BootstrapConfig, SystemConfig, WebConfig } from "@/model/config";

interface AppContextValue {
  isInitialized: boolean;
  isSystemConfigLoaded: boolean;
  bootstrapConfig: BootstrapConfig | null;
  systemConfig: SystemConfig | null;
  webConfig: WebConfig | null;
}

const AppContext = createContext<AppContextValue>({
  isInitialized: false,
  isSystemConfigLoaded: false,
  bootstrapConfig: null,
  systemConfig: null,
  webConfig: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  return useContext(AppContext);
}

// Routes that don't require authentication
const UNAUTHENTICATED_ROUTES = [
  Paths.Login,
  Paths.LoginCallback,
  Paths.Logout,
  Paths.LicenseMissing,
  Paths.ConfigMissing,
  Paths.Unauthorised,
];

function isUnauthenticatedRoute(path: string): boolean {
  return UNAUTHENTICATED_ROUTES.some((route) => path === route || path.startsWith(route + "/"));
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [contextValue, setContextValue] = useState<AppContextValue>({
    isInitialized: false,
    isSystemConfigLoaded: false,
    bootstrapConfig: null,
    systemConfig: null,
    webConfig: null,
  });

  const { isAuthenticated, tokens, rememberDestination } = useAuthStore();
  const navigate = useNavigate();

  // Periodically check for session expiry and show dialog when token expires
  useSessionExpiryChecker();
  const location = useLocation();

  // Check for config changes and show banner when detected
  const { hasConfigChanged } = useConfigChangeDetector({
    currentBootstrapConfig: contextValue.bootstrapConfig,
    currentSystemConfig: contextValue.systemConfig,
    authToken: tokens?.accessToken || null,
    enabled: isInitialized,
  });

  const handleReload = () => {
    window.location.reload();
  };

  // Initialize app on mount
  // Note: fetchWebConfig and fetchSystemBootstrap are cached, so these calls
  // return the already-fetched values from main.tsx. If they had failed,
  // AppUnavailable would have been rendered instead of this component.
  useEffect(() => {
    async function initializeApp() {
      // Fetch web config (returns cached value from main.tsx)
      const webConfig = await fetchWebConfig();
      setApiBaseUrl(webConfig.apiBaseUrl);

      // Fetch bootstrap config (returns cached value from main.tsx)
      const bootstrapConfig = await fetchSystemBootstrap();

      // Always set context value so other effects can access bootstrap config
      setContextValue({
        isInitialized: true,
        isSystemConfigLoaded: false,
        bootstrapConfig,
        systemConfig: null,
        webConfig,
      });
      setIsInitialized(true);

      // Check license after setting context
      if (!bootstrapConfig.isLicensed && location.pathname !== Paths.LicenseMissing) {
        navigate(Paths.LicenseMissing, { replace: true });
        return;
      }

      // Check config availability after setting context
      if (!bootstrapConfig.hasConfig && location.pathname !== Paths.ConfigMissing) {
        navigate(Paths.ConfigMissing, { replace: true });
        return;
      }
    }

    initializeApp();
  }, [location.pathname, navigate]);

  // Auth guard effect
  useEffect(() => {
    if (!isInitialized) return;

    // Wait for bootstrap config to be loaded before checking auth
    if (!contextValue.bootstrapConfig) return;

    const currentPath = location.pathname;

    // Skip auth check for unauthenticated routes
    if (isUnauthenticatedRoute(currentPath)) {
      return;
    }

    // Skip auth check if we're redirecting to an error page due to license/config issues
    // (the initialization effect above will handle the redirect)
    if (!contextValue.bootstrapConfig.isLicensed) {
      return;
    }
    if (!contextValue.bootstrapConfig.hasConfig) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      rememberDestination(currentPath);
      navigate(Paths.Login, { replace: true });
      return;
    }

    // Fetch system config for authenticated routes (only if not already loaded)
    if (tokens?.accessToken && !contextValue.isSystemConfigLoaded) {
      fetchSystemConfig(tokens.accessToken).then((systemConfig) => {
        setContextValue((prev) => ({
          ...prev,
          systemConfig,
          isSystemConfigLoaded: true,
        }));
      });
    }
  }, [
    isInitialized,
    isAuthenticated,
    location.pathname,
    tokens?.accessToken,
    navigate,
    rememberDestination,
    contextValue.bootstrapConfig,
    contextValue.isSystemConfigLoaded,
  ]);

  // Show loading state while initializing
  if (!isInitialized || !contextValue.isSystemConfigLoaded) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground mt-4">Loading CodeMetrics...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      {hasConfigChanged && <ConfigChangeBanner onReload={handleReload} />}
      {children}
    </AppContext.Provider>
  );
}
