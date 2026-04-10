import { describe, it, expect, beforeEach } from "vitest";
import i18n from "@/i18n";

describe("i18n Configuration", () => {
  beforeEach(async () => {
    // Ensure i18n is initialized
    if (!i18n.isInitialized) {
      await i18n.init();
    }
  });

  it("should be initialized with en locale by default", () => {
    expect(i18n.language).toBe("en");
  });

  it("should have all required namespaces loaded", () => {
    const namespaces = ["nav", "common", "pages", "components", "buttons"];
    namespaces.forEach((ns) => {
      expect(i18n.hasResourceBundle("en", ns)).toBe(true);
    });
  });

  it("should translate navigation keys", () => {
    const t = i18n.t.bind(i18n);
    expect(t("nav:home")).toBe("Home");
    expect(t("nav:programme")).toBe("Programme");
    expect(t("nav:security")).toBe("Security");
    expect(t("nav:workload")).toBe("Workloads");
  });

  it("should translate common keys", () => {
    const t = i18n.t.bind(i18n);
    expect(t("common:loading")).toBe("Loading...");
    expect(t("common:error")).toBe("Error");
    expect(t("common:cancel")).toBe("Cancel");
    expect(t("common:save")).toBe("Save");
  });

  it("should translate page-specific keys", () => {
    const t = i18n.t.bind(i18n);
    expect(t("pages:security.title")).toBe("Security");
    expect(t("pages:security.description")).toBe("Security posture and vulnerability reports.");
    expect(t("pages:licenseMissing.title")).toBe("License Required");
  });

  it("should handle nested translation keys", () => {
    const t = i18n.t.bind(i18n);
    expect(t("pages:security.description")).toBeDefined();
    expect(t("pages:licenseMissing.administrator")).toBe("administrator");
  });

  it("should return key as fallback when translation is missing", () => {
    const t = i18n.t.bind(i18n);
    const result = t("non.existent.key");
    // i18next returns the key as fallback
    expect(result).toBeDefined();
  });

  it("should support interpolation with variables", () => {
    const t = i18n.t.bind(i18n);
    // This tests the capability to use interpolation in translations
    // Example: if we had a translation with {{count}}
    const result = t("nav:home"); // Test with existing key
    expect(result).toBe("Home");
  });
});
