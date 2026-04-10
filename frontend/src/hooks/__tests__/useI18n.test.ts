import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import i18n from "@/i18n";
import { useI18n } from "@/hooks/useI18n";
import { I18nextProvider } from "react-i18next";
import React from "react";

describe("useI18n Hook", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(I18nextProvider, { i18n }, children);

  it("should return translation function", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(typeof result.current.t).toBe("function");
  });

  it("should return i18n instance", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.i18n).toBeDefined();
  });

  it("should return current locale", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe("en");
  });

  it("should provide setLocale function", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(typeof result.current.setLocale).toBe("function");
  });

  it("should translate keys correctly", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    const translation = result.current.t("nav:home");
    expect(translation).toBe("Home");
  });

  it("should handle namespaced keys", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    const translation = result.current.t("pages:security.title");
    expect(translation).toBe("Security");
  });
});
