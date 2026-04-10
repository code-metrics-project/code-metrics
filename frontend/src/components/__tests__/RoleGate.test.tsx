import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleGate } from "@/components/RoleGate";

// Helper: build a minimal JWT with the given payload (unsigned, for testing only)
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

const FUTURE_EXP = 9999999999;

const { mockUseAuthStore } = vi.hoisted(() => ({
  mockUseAuthStore: vi.fn(),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => mockUseAuthStore(selector),
}));

function setTokens(accessToken: string | undefined) {
  mockUseAuthStore.mockImplementation((selector: (state: { tokens?: { accessToken?: string } }) => unknown) =>
    selector({ tokens: accessToken ? { accessToken, refreshToken: "rt" } : undefined })
  );
}

describe("RoleGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when the user has no tokens", () => {
    setTokens(undefined);
    render(
      <RoleGate role="admin">
        <span>admin content</span>
      </RoleGate>
    );
    expect(screen.queryByText("admin content")).toBeNull();
  });

  it("renders nothing when the token has no roles claim", () => {
    setTokens(makeToken({ sub: "alice", exp: FUTURE_EXP }));
    render(
      <RoleGate role="admin">
        <span>admin content</span>
      </RoleGate>
    );
    expect(screen.queryByText("admin content")).toBeNull();
  });

  it("renders nothing when the user lacks the required role", () => {
    setTokens(makeToken({ sub: "alice", exp: FUTURE_EXP, roles: ["viewer"] }));
    render(
      <RoleGate role="admin">
        <span>admin content</span>
      </RoleGate>
    );
    expect(screen.queryByText("admin content")).toBeNull();
  });

  it("renders children when the user has the required role", () => {
    setTokens(makeToken({ sub: "alice", exp: FUTURE_EXP, roles: ["admin"] }));
    render(
      <RoleGate role="admin">
        <span>admin content</span>
      </RoleGate>
    );
    expect(screen.getByText("admin content")).toBeDefined();
  });

  it("renders children when the user has the required role among multiple roles", () => {
    setTokens(makeToken({ sub: "alice", exp: FUTURE_EXP, roles: ["viewer", "admin"] }));
    render(
      <RoleGate role="admin">
        <span>admin content</span>
      </RoleGate>
    );
    expect(screen.getByText("admin content")).toBeDefined();
  });

  it("renders children for a non-admin role when it is present", () => {
    setTokens(makeToken({ sub: "alice", exp: FUTURE_EXP, roles: ["editor"] }));
    render(
      <RoleGate role="editor">
        <span>editor content</span>
      </RoleGate>
    );
    expect(screen.getByText("editor content")).toBeDefined();
  });

  it("is case-sensitive and does not render when casing differs", () => {
    setTokens(makeToken({ sub: "alice", exp: FUTURE_EXP, roles: ["Admin"] }));
    render(
      <RoleGate role="admin">
        <span>admin content</span>
      </RoleGate>
    );
    expect(screen.queryByText("admin content")).toBeNull();
  });
});
