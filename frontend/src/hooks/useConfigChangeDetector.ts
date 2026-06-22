import { useEffect, useState } from "react";
import { SYSTEM_BOOTSTRAP, SYSTEM_CONFIG } from "@/api/endpoints";
import type { BootstrapConfig, SystemConfig } from "@/model/config";

export const DEFAULT_POLL_INTERVAL_MS = 30000; // Poll every 30 seconds if not found in bootstrap config

interface ConfigChangeDetectorOptions {
  currentBootstrapConfig: BootstrapConfig | null;
  currentSystemConfig: SystemConfig | null;
  authToken: string | null;
  enabled: boolean;
}

export function useConfigChangeDetector({
  currentBootstrapConfig,
  currentSystemConfig,
  authToken,
  enabled,
}: ConfigChangeDetectorOptions) {
  const [hasConfigChanged, setHasConfigChanged] = useState(false);

  useEffect(() => {
    if (!enabled || !currentBootstrapConfig) {
      return;
    }

    const pollIntervalMs = currentBootstrapConfig.configCacheTtlMs ?? DEFAULT_POLL_INTERVAL_MS;
    if (pollIntervalMs <= 0) {
      return;
    }

    const checkForConfigChanges = async () => {
      try {
        // Always check bootstrap config
        const freshBootstrapConfig = (await fetchConfigFromEndpoint(SYSTEM_BOOTSTRAP)) as BootstrapConfig;

        // Compare bootstrap config fields
        const bootstrapChanged =
          freshBootstrapConfig.isLicensed !== currentBootstrapConfig.isLicensed ||
          freshBootstrapConfig.hasConfig !== currentBootstrapConfig.hasConfig ||
          freshBootstrapConfig.apiVersion !== currentBootstrapConfig.apiVersion ||
          freshBootstrapConfig.configCacheTtlMs !== currentBootstrapConfig.configCacheTtlMs ||
          JSON.stringify(freshBootstrapConfig.features) !== JSON.stringify(currentBootstrapConfig.features);

        if (bootstrapChanged) {
          setHasConfigChanged(true);
          return;
        }

        // Check system config if authenticated
        if (authToken && currentSystemConfig) {
          const freshSystemConfig = (await fetchConfigFromEndpoint(
            SYSTEM_CONFIG,
            authToken
          )) as SystemConfig;

          // Compare system config - use JSON comparison for simplicity
          // Could be more granular if needed (workloads, repos, etc.)
          const systemConfigChanged =
            JSON.stringify(freshSystemConfig) !== JSON.stringify(currentSystemConfig);

          if (systemConfigChanged) {
            setHasConfigChanged(true);
          }
        }
      } catch (e) {
        // Silently fail - we don't want to disrupt the user experience
        console.debug("[ConfigChangeDetector] Failed to check for config changes", e);
      }
    };
    const intervalId = window.setInterval(checkForConfigChanges, pollIntervalMs);

    // Cleanup on unmount
    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentBootstrapConfig, currentSystemConfig, authToken, enabled]);

  return { hasConfigChanged };
}

async function fetchConfigFromEndpoint(url: string, authToken?: string): Promise<unknown> {
  const headers: HeadersInit = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.statusText}`);
  }
  return response.json();
}
