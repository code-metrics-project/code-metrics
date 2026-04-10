import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchWebConfig, fetchSystemBootstrap, fetchSystemConfig } from "@/config";
import { setApiBaseUrl } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { Paths } from "@/router/paths";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSessionExpiryChecker } from "@/hooks/useSessionExpiryChecker";
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

      // Check license
      if (!bootstrapConfig.isLicensed && location.pathname !== Paths.LicenseMissing) {
        navigate(Paths.LicenseMissing, { replace: true });
        setIsInitialized(true);
        return;
      }

      // Check config availability
      if (!bootstrapConfig.hasConfig && location.pathname !== Paths.ConfigMissing) {
        navigate(Paths.ConfigMissing, { replace: true });
        setIsInitialized(true);
        return;
      }

      setContextValue({
        isInitialized: true,
        isSystemConfigLoaded: false,
        bootstrapConfig,
        systemConfig: null,
        webConfig,
      });
      setIsInitialized(true);
    }

    initializeApp();
  }, [location.pathname, navigate]);

  // Auth guard effect
  useEffect(() => {
    if (!isInitialized) return;

    const currentPath = location.pathname;

    // Skip auth check for unauthenticated routes
    if (isUnauthenticatedRoute(currentPath)) {
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
    contextValue.isSystemConfigLoaded,
  ]);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground mt-4">Loading CodeMetrics...</p>
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}
