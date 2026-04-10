import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/store/auth", () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    tokens: { accessToken: "token-123" },
    logout: vi.fn(),
  })),
}));

vi.mock("@/router", () => ({
  default: {
    currentRoute: {
      value: {
        fullPath: "/dashboard",
      },
    },
  },
}));

vi.mock("@/router/paths", () => ({
  Paths: {
    Login: "/login",
  },
}));

import { client, create, setApiBaseUrl } from "../apiClient";

describe("fetch-backed api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    setApiBaseUrl("https://api.example.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds base URL, auth header, and query params to GET requests", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: vi.fn(() => "application/json") },
      json: vi.fn().mockResolvedValue([{ id: 1 }]),
      text: vi.fn(),
    });

    const response = await client.get<{ id: number }[]>("/api/items", {
      params: { page: 2, q: "test" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/items?page=2&q=test",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      }),
    );
    expect(response.data).toEqual([{ id: 1 }]);
  });

  it("parses error responses and rejects failed requests", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: { get: vi.fn(() => "application/json") },
      json: vi.fn().mockResolvedValue({ message: "Bad request" }),
      text: vi.fn(),
    });

    await expect(client.post("/api/items", { id: 1 })).rejects.toMatchObject({
      name: "HttpError",
      response: {
        status: 400,
        data: { message: "Bad request" },
      },
    });
  });

  it("preserves default headers for created clients", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: vi.fn(() => "application/json") },
      json: vi.fn().mockResolvedValue({ ok: true }),
      text: vi.fn(),
    });

    const bootstrapClient = create({ headers: { Authorization: "Bearer bootstrap-token" } });

    await bootstrapClient.get("/api/system/config");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/api/system/config",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer bootstrap-token",
        }),
      }),
    );
  });
});
