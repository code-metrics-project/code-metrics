import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BootstrapLoader } from "@/components/BootstrapLoader";

describe("BootstrapLoader", () => {
  it("shows loading state before timeout", () => {
    render(<BootstrapLoader timedOut={false} />);

    expect(screen.getByText("CodeMetrics is currently waiting for the backend services...")).toBeDefined();
    expect(screen.queryByTestId("bootstrap-timeout-alert")).toBeNull();
  });

  it("shows timeout alert and refresh action after timeout", () => {
    render(<BootstrapLoader timedOut={true} />);

    expect(screen.getByTestId("bootstrap-timeout-alert")).toBeDefined();
    const refreshButton = screen.getByRole("button", { name: "Refresh Page" });
    expect(refreshButton).toBeDefined();
  });
});
