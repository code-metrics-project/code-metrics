import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import nav from "./en/nav";
import common from "./en/common";
import pages from "./en/pages";
import components from "./en/components";
import buttons from "./en/buttons";
import jaNav from "./ja/nav";
import jaCommon from "./ja/common";
import jaPages from "./ja/pages";
import jaComponents from "./ja/components";
import jaButtons from "./ja/buttons";
import esNav from "./es/nav";
import esCommon from "./es/common";
import esPages from "./es/pages";
import esComponents from "./es/components";
import esButtons from "./es/buttons";
import deNav from "./de/nav";
import deCommon from "./de/common";
import dePages from "./de/pages";
import deComponents from "./de/components";
import deButtons from "./de/buttons";
import frNav from "./fr/nav";
import frCommon from "./fr/common";
import frPages from "./fr/pages";
import frComponents from "./fr/components";
import frButtons from "./fr/buttons";
import cyNav from "./cy/nav";
import cyCommon from "./cy/common";
import cyPages from "./cy/pages";
import cyComponents from "./cy/components";
import cyButtons from "./cy/buttons";

const resources = {
  en: {
    nav,
    common,
    pages,
    components,
    buttons,
  },
  ja: {
    nav: jaNav,
    common: jaCommon,
    pages: jaPages,
    components: jaComponents,
    buttons: jaButtons,
  },
  es: {
    nav: esNav,
    common: esCommon,
    pages: esPages,
    components: esComponents,
    buttons: esButtons,
  },
  de: {
    nav: deNav,
    common: deCommon,
    pages: dePages,
    components: deComponents,
    buttons: deButtons,
  },
  fr: {
    nav: frNav,
    common: frCommon,
    pages: frPages,
    components: frComponents,
    buttons: frButtons,
  },
  cy: {
    nav: cyNav,
    common: cyCommon,
    pages: cyPages,
    components: cyComponents,
    buttons: cyButtons,
  },
};

export const supportedLanguages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "cy", name: "Cymraeg", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "ja", "es", "de", "fr", "cy"],
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
  });

export default i18n;
