import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Hoisted mocks — declared before any module import to satisfy vi.mock.
 */
const { mockClientGet, mockRetry } = vi.hoisted(() => ({
  mockClientGet: vi.fn(),
  mockRetry: vi.fn(),
}));

vi.mock("@/api/client", () => ({
  default: { get: mockClientGet },
}));

vi.mock("@/utils/retry", () => ({
  retryOperationUntilTimeout: mockRetry,
}));

vi.mock("@/utils/logger", () => ({
  logger: vi.fn(),
}));

/**
 * Because config.ts uses module-level caching variables (bootstrapConfig,
 * webConfig, systemConfig), we must re-import the module for every test
 * to start with a clean slate.
 */
async function loadConfigModule() {
  return await import("../config");
}

describe("config", () => {
  beforeEach(() => {
    vi.resetModules();
    mockClientGet.mockReset();
    mockRetry.mockReset();
  });

  // ───────────────────── fetchWebConfig ─────────────────────

  describe("fetchWebConfig", () => {
    it("fetches config.json and returns the web config", async () => {
      const webConfig = { apiBaseUrl: "http://localhost:3000", logLevel: "info" };
      mockClientGet.mockResolvedValue({ data: webConfig });

      const { fetchWebConfig } = await loadConfigModule();
      const result = await fetchWebConfig();

      expect(result).toEqual(webConfig);
      expect(mockClientGet).toHaveBeenCalledWith("/config.json", {});
    });

    it("caches the result on subsequent calls", async () => {
      const webConfig = { apiBaseUrl: "http://localhost:3000" };
      mockClientGet.mockResolvedValue({ data: webConfig });

      const { fetchWebConfig } = await loadConfigModule();
      await fetchWebConfig();
      await fetchWebConfig();

      expect(mockClientGet).toHaveBeenCalledTimes(1);
    });

    it("throws when the fetch fails", async () => {
      mockClientGet.mockRejectedValue(new Error("network error"));

      const { fetchWebConfig } = await loadConfigModule();
      await expect(fetchWebConfig()).rejects.toThrow("network error");
    });
  });

  // ───────────────────── fetchSystemBootstrap ─────────────────────

  describe("fetchSystemBootstrap", () => {
    it("calls retryOperationUntilTimeout with a 2-minute timeout and backoff by default", async () => {
      const bootstrap = { isLicensed: true, hasConfig: true };
      mockRetry.mockResolvedValue(bootstrap);

      const { fetchSystemBootstrap } = await loadConfigModule();
      await fetchSystemBootstrap();

      expect(mockRetry).toHaveBeenCalledTimes(1);
      const [options] = mockRetry.mock.calls[0];
      expect(options).toEqual(
        expect.objectContaining({
          name: "Fetch bootstrap config",
          timeout: 120_000,
          backoff: 2,
        })
      );
    });

    it("respects VITE_BOOTSTRAP_RETRY_TIMEOUT env override", async () => {
      // Set the env var before importing the module
      import.meta.env.VITE_BOOTSTRAP_RETRY_TIMEOUT = "5000";

      const bootstrap = { isLicensed: true };
      mockRetry.mockResolvedValue(bootstrap);

      const { fetchSystemBootstrap } = await loadConfigModule();
      await fetchSystemBootstrap();

      const [options] = mockRetry.mock.calls[0];
      expect(options.timeout).toBe(5000);

      // Clean up
      delete import.meta.env.VITE_BOOTSTRAP_RETRY_TIMEOUT;
    });

    it("returns the bootstrap config on success", async () => {
      const bootstrap = { isLicensed: true, hasConfig: true, authMode: "local" };
      mockRetry.mockResolvedValue(bootstrap);

      const { fetchSystemBootstrap } = await loadConfigModule();
      const result = await fetchSystemBootstrap();

      expect(result).toEqual(bootstrap);
    });

    it("delegates the actual fetch to the operation callback", async () => {
      const bootstrap = { isLicensed: true };
      // Capture the operation callback and invoke it ourselves
      mockRetry.mockImplementation(async (_opts: unknown, operation: () => Promise<unknown>) => {
        return operation();
      });
      mockClientGet.mockResolvedValue({ data: bootstrap });

      const { fetchSystemBootstrap } = await loadConfigModule();
      const result = await fetchSystemBootstrap();

      expect(result).toEqual(bootstrap);
      expect(mockClientGet).toHaveBeenCalledWith("/api/system/bootstrap", {});
    });

    it("caches the result on subsequent calls", async () => {
      const bootstrap = { isLicensed: true };
      mockRetry.mockResolvedValue(bootstrap);

      const { fetchSystemBootstrap } = await loadConfigModule();
      await fetchSystemBootstrap();
      await fetchSystemBootstrap();

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it("throws when retry times out", async () => {
      mockRetry.mockRejectedValue(new Error("Fetch bootstrap config timed out after 180000 ms. Last error: 500"));

      const { fetchSystemBootstrap } = await loadConfigModule();
      await expect(fetchSystemBootstrap()).rejects.toThrow(/timed out/);
    });

    it("does not cache on failure — allows retrying after error", async () => {
      const bootstrap = { isLicensed: true };
      mockRetry.mockRejectedValueOnce(new Error("timed out")).mockResolvedValueOnce(bootstrap);

      const { fetchSystemBootstrap } = await loadConfigModule();

      // First call fails
      await expect(fetchSystemBootstrap()).rejects.toThrow("timed out");
      // Second call succeeds
      const result = await fetchSystemBootstrap();
      expect(result).toEqual(bootstrap);
      expect(mockRetry).toHaveBeenCalledTimes(2);
    });
  });

  // ───────────────────── fetchSystemConfig ─────────────────────

  describe("fetchSystemConfig", () => {
    it("fetches system config with auth header", async () => {
      const sysConfig = { workloads: [] };
      mockClientGet.mockResolvedValue({ data: sysConfig });

      const { fetchSystemConfig } = await loadConfigModule();
      const result = await fetchSystemConfig("my-token");

      expect(result).toEqual(sysConfig);
      expect(mockClientGet).toHaveBeenCalledWith("/api/system/config", {
        headers: { Authorization: "Bearer my-token" },
      });
    });

    it("caches the result on subsequent calls", async () => {
      mockClientGet.mockResolvedValue({ data: { workloads: [] } });

      const { fetchSystemConfig } = await loadConfigModule();
      await fetchSystemConfig("token-1");
      await fetchSystemConfig("token-2");

      expect(mockClientGet).toHaveBeenCalledTimes(1);
    });

    it("throws when the fetch fails", async () => {
      mockClientGet.mockRejectedValue(new Error("unauthorized"));

      const { fetchSystemConfig } = await loadConfigModule();
      await expect(fetchSystemConfig("bad-token")).rejects.toThrow("unauthorized");
    });
  });

  // ───────────────────── getBootstrap / getConfig helpers ─────────────────────

  describe("getBootstrap", () => {
    it("returns undefined before bootstrap is fetched", async () => {
      const { getBootstrap } = await loadConfigModule();
      expect(getBootstrap()).toBeUndefined();
    });

    it("returns the cached bootstrap after fetch", async () => {
      const bootstrap = { isLicensed: true, hasConfig: true };
      mockRetry.mockResolvedValue(bootstrap);

      const { fetchSystemBootstrap, getBootstrap } = await loadConfigModule();
      await fetchSystemBootstrap();
      expect(getBootstrap()).toEqual(bootstrap);
    });
  });

  describe("getConfig", () => {
    it("returns undefined configs before any fetch", async () => {
      const { getConfig } = await loadConfigModule();
      const config = getConfig();
      expect(config.systemConfig).toBeUndefined();
      expect(config.webConfig).toBeUndefined();
    });
  });
});
