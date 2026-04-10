import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { AppUnavailable } from "@/AppUnavailable";

const renderComponent = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <AppUnavailable />
    </I18nextProvider>
  );

describe("AppUnavailable", () => {
  it("renders translated title and description", () => {
    renderComponent();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Couldn't reach the CodeMetrics API to fetch basic configuration."
    );
    expect(
      screen.getByText(
        "Please check the API is running and that the connection details are correct, then refresh the page."
      )
    ).toBeDefined();
  });

  it("renders translated button label", () => {
    renderComponent();

    expect(screen.getByRole("button", { name: "Refresh Page" })).toBeDefined();
  });
});
