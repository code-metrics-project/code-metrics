import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorAlertPanel } from "@/components/ErrorAlertPanel";

describe("ErrorAlertPanel", () => {
  it("renders title, description, and action button", () => {
    const onAction = vi.fn();

    render(
      <ErrorAlertPanel
        title="Something went wrong"
        description="Please try again later."
        actionLabel="Retry"
        onAction={onAction}
        testId="error-alert"
      />
    );

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByTestId("error-alert")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeDefined();
    expect(screen.getByText("Please try again later.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("calls onAction when the button is clicked", () => {
    const onAction = vi.fn();

    render(
      <ErrorAlertPanel
        title="Something went wrong"
        description="Please try again later."
        actionLabel="Retry"
        onAction={onAction}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("renders an h2 heading when headingLevel is 2", () => {
    render(
      <ErrorAlertPanel
        title="Something went wrong"
        description="Please try again later."
        actionLabel="Retry"
        onAction={() => undefined}
        headingLevel={2}
      />
    );

    expect(screen.getByRole("heading", { level: 2, name: "Something went wrong" })).toBeDefined();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
