import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Logout from "@/pages/Logout";

const { mockUseSearchParams, mockNavigate, mockLogout } = vi.hoisted(() => ({
  mockUseSearchParams: vi.fn(),
  mockNavigate: vi.fn(),
  mockLogout: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => mockUseSearchParams(),
  };
});

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/store/auth", () => ({
  useAuthStore: () => ({
    logout: () => mockLogout(),
    isAuthenticated: true,
  }),
}));

vi.mock("@/services/auth", () => ({
  getErrorMessage: () => ({ message: "something went wrong" }),
}));

describe("Logout page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue([new URLSearchParams(""), vi.fn()]);
  });

  it("shows the spinner and signing-out text while logging out", () => {
    render(<Logout />);

    const text = screen.getByText("pages:logout.signingOut");
    const wrapper = text.parentElement;

    // The spinner must be a sibling of the text within the wrapper
    expect(wrapper).not.toBeNull();
    const spinner = wrapper?.querySelector("svg");
    expect(spinner).not.toBeNull();

    // Regression: same centring requirement as the app loading screen (issue #1287)
    expect(wrapper?.className).toContain("flex");
    expect(wrapper?.className).toContain("flex-col");
    expect(wrapper?.className).toContain("items-center");
  });

  it("shows an error alert instead of the spinner when an error is present", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams("error=ServerError"), vi.fn()]);

    render(<Logout />);

    expect(screen.getByText("pages:logout.authenticationError")).toBeDefined();
    expect(screen.queryByText("pages:logout.signingOut")).toBeNull();
    // Session is still cleared, but the user is not redirected back to login
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
