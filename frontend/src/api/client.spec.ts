import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuthGetState, mockDialogGetState, mockFetch } = vi.hoisted(() => ({
  mockAuthGetState: vi.fn(),
  mockDialogGetState: vi.fn(() => ({ push: vi.fn() })),
  mockFetch: vi.fn(),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: {
    getState: mockAuthGetState,
  },
}));

vi.mock("@/store/dialog", () => ({
  useDialogStore: {
    getState: mockDialogGetState,
  },
}));

vi.mock("@/router/paths", () => ({
  Paths: {
    Login: "/login",
  },
}));

vi.mock("@/api/endpoints", () => ({
  REFRESH: "/api/refresh",
}));

vi.mock("@/i18n", () => ({
  default: {
    t: (key: string) => key,
  },
}));

describe("api client", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    mockAuthGetState.mockReset();
    mockDialogGetState.mockClear();
    mockAuthGetState.mockReturnValue({
      isAuthenticated: false,
      tokens: undefined,
      logout: vi.fn(),
    });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn(() => "application/json"),
      },
      json: vi.fn(async () => ({ ok: true })),
      text: vi.fn(async () => "ok"),
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  it("does not send a Content-Type header for GET requests without a body", async () => {
    const { default: client, setApiBaseUrl } = await import("./client");
    setApiBaseUrl("https://api.example.com");

    await client.get("/api/system/bootstrap");

    expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/api/system/bootstrap", {
      method: "GET",
      headers: {},
      body: undefined,
    });
  });

  it("sends Authorization but not Content-Type for authenticated GET requests", async () => {
    mockAuthGetState.mockReturnValue({
      isAuthenticated: true,
      tokens: { accessToken: "token-123" },
      logout: vi.fn(),
    });

    const { default: client, setApiBaseUrl } = await import("./client");
    setApiBaseUrl("https://api.example.com");

    await client.get("/api/system/config");

    expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/api/system/config", {
      method: "GET",
      headers: { Authorization: "Bearer token-123" },
      body: undefined,
    });
  });

  it("adds Content-Type for POST requests with a JSON body", async () => {
    const { default: client, setApiBaseUrl } = await import("./client");
    setApiBaseUrl("https://api.example.com");

    await client.post("/api/authenticate", { username: "user", password: "pass" });

    expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/api/authenticate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "user", password: "pass" }),
    });
  });
});
