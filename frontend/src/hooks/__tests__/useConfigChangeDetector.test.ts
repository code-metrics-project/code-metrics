import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Features, type FeatureConfig } from "@/config/features";
import {
  DEFAULT_POLL_INTERVAL_MS,
  useConfigChangeDetector,
} from "@/hooks/useConfigChangeDetector";
import type { BootstrapConfig } from "@/model/config";

const features: FeatureConfig = {
  [Features.dora]: false,
  [Features.languageSelector]: false,
  [Features.mlForecasts]: false,
  [Features.predictions]: false,
  [Features.temporalCoupling]: false,
};

const bootstrapConfig = (overrides: Partial<BootstrapConfig> = {}): BootstrapConfig => ({
  apiVersion: "2.0",
  auth: {
    store: "cookie",
  },
  features,
  hasConfig: true,
  isLicensed: true,
  ...overrides,
});

describe("useConfigChangeDetector", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses configCacheTtlMs from bootstrap config as the polling interval", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval").mockReturnValue(1);
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);

    renderHook(() =>
      useConfigChangeDetector({
        currentBootstrapConfig: bootstrapConfig({ configCacheTtlMs: 45000 }),
        currentSystemConfig: null,
        authToken: null,
        enabled: true,
      })
    );

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 45000);
  });

  it("falls back to the default polling interval when bootstrap config has no TTL", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval").mockReturnValue(1);
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);

    renderHook(() =>
      useConfigChangeDetector({
        currentBootstrapConfig: bootstrapConfig(),
        currentSystemConfig: null,
        authToken: null,
        enabled: true,
      })
    );

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), DEFAULT_POLL_INTERVAL_MS);
  });

  it("does not start polling when bootstrap config TTL is zero", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval").mockReturnValue(1);
    vi.spyOn(window, "clearInterval").mockImplementation(() => undefined);

    renderHook(() =>
      useConfigChangeDetector({
        currentBootstrapConfig: bootstrapConfig({ configCacheTtlMs: 0 }),
        currentSystemConfig: null,
        authToken: null,
        enabled: true,
      })
    );

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});
