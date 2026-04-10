import { describe, it, expect } from "vitest";
import i18n, { supportedLanguages } from "@/i18n";

const languageCodes = supportedLanguages.map(({ code }) => code);
const requiredKeys = [
  "session.expired.title",
  "session.expired.subtitle",
  "session.expired.text",
  "session.expired.confirm",
  "session.expiringSoon.title",
  "session.expiringSoon.subtitle",
  "session.expiringSoon.text",
  "session.expiringSoon.confirm",
  "session.expiringSoon.cancel",
] as const;

describe("session dialog translations", () => {
  it.each(languageCodes)("provides required strings for %s", (locale) => {
    requiredKeys.forEach((key) => {
      const value = i18n.getResource(locale, "pages", key);

      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    });
  });
});
