import { useAppContext } from "@/components/AppProvider";
import type { SystemConfig, WebConfig } from "@/model/config";

export interface UseConfigResult {
  config: {
    systemConfig?: SystemConfig;
    webConfig?: WebConfig;
  } | null;
  isLoading: boolean;
}

export function useConfig(): UseConfigResult {
  const { systemConfig, webConfig, isInitialized, isSystemConfigLoaded } = useAppContext();

  return {
    config:
      systemConfig || webConfig
        ? {
            systemConfig: systemConfig ?? undefined,
            webConfig: webConfig ?? undefined,
          }
        : null,
    // Loading until both initialized AND system config is loaded
    isLoading: !isInitialized || !isSystemConfigLoaded,
  };
}
