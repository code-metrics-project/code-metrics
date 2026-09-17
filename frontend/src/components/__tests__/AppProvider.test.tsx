import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppProvider } from "@/components/AppProvider";

const { mockFetchWebConfig, mockFetchSystemBootstrap, mockFetchSystemConfig, mockNavigate } = vi.hoisted(() => ({
  mockFetchWebConfig: vi.fn(),
  mockFetchSystemBootstrap: vi.fn(),
  mockFetchSystemConfig: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("@/config", () => ({
  fetchWebConfig: () => mockFetchWebConfig(),
  fetchSystemBootstrap: () => mockFetchSystemBootstrap(),
  fetchSystemConfig: (token: string) => mockFetchSystemConfig(token),
}));

vi.mock("@/api/client", () => ({
  setApiBaseUrl: vi.fn(),
  default: { get: vi.fn() },
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    tokens: { accessToken: "test-token", refreshToken: "test-refresh" },
    rememberDestination: vi.fn(),
  }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/" }),
  };
});

vi.mock("@/hooks/useSessionExpiryChecker", () => ({
  useSessionExpiryChecker: () => {},
}));

vi.mock("@/hooks/useConfigChangeDetector", () => ({
  useConfigChangeDetector: () => ({ hasConfigChanged: false }),
}));

vi.mock("@/components/ConfigChangeBanner", () => ({
  ConfigChangeBanner: () => null,
}));

const webConfig = { apiBaseUrl: "", auth: { required: true } };
const bootstrapConfig = {
  apiVersion: "1.0",
  auth: { store: "sessionstorage" as const },
  features: {},
  hasConfig: true,
  isLicensed: true,
};
const systemConfig = { branches: [], issuePriorities: [], tags: {}, workloads: [] };

describe("AppProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loading state", () => {
    it("shows the spinner and text while system config is loading", async () => {
      mockFetchWebConfig.mockResolvedValue(webConfig);
      mockFetchSystemBootstrap.mockResolvedValue(bootstrapConfig);
      // System config never resolves so the loading state persists
      mockFetchSystemConfig.mockReturnValue(new Promise(() => {}));

      render(
        <AppProvider>
          <div>app-content</div>
        </AppProvider>
      );

      const text = await screen.findByText("Loading CodeMetrics...");
      const wrapper = text.parentElement;

      // The spinner must be a sibling of the text within the wrapper
      expect(wrapper).not.toBeNull();
      const spinner = wrapper?.querySelector("svg");
      expect(spinner).not.toBeNull();

      // Regression: Tailwind preflight makes svg display:block, so text-center alone
      // leaves the spinner left-aligned next to the centred text. The wrapper must
      // centre both with flexbox (see issue #1287).
      expect(wrapper?.className).toContain("flex");
      expect(wrapper?.className).toContain("flex-col");
      expect(wrapper?.className).toContain("items-center");
    });

    it("replaces the loading state with children once config is loaded", async () => {
      mockFetchWebConfig.mockResolvedValue(webConfig);
      mockFetchSystemBootstrap.mockResolvedValue(bootstrapConfig);
      mockFetchSystemConfig.mockResolvedValue(systemConfig);

      render(
        <AppProvider>
          <div>app-content</div>
        </AppProvider>
      );

      expect(await screen.findByText("app-content")).toBeDefined();
      expect(screen.queryByText("Loading CodeMetrics...")).toBeNull();
    });
  });
});
