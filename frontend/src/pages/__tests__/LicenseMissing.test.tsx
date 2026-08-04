import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import LicenseMissing from "@/pages/LicenseMissing";

const renderComponent = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <LicenseMissing />
    </I18nextProvider>
  );

describe("LicenseMissing", () => {
  it("renders translated title and description", () => {
    renderComponent();

    expect(screen.getByRole("heading", { level: 1, name: "License Required" })).toBeDefined();
    expect(
      screen.getByText(
        "Your Code Metrics installation does not have a valid license configured. Please contact your administrator."
      )
    ).toBeDefined();
  });

  it("renders translated retry button", () => {
    renderComponent();

    expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
  });

  it("navigates to origin when retry is clicked", () => {
    const originalHref = window.location.href;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: originalHref },
    });

    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(window.location.href).toBe(window.location.origin);
  });
});
