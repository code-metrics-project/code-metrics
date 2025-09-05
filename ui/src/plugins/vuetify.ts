import "vuetify/styles";
import { createVuetify, type ThemeInstance } from "vuetify";
import * as components from "vuetify/components";
import * as labsComponents from "vuetify/labs/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

// https://omniadocs.aaps.deloitte.com/core-fe-mfe/#Branding
const DD_BRAND_COLOURS = {
  BLACK_ALPHA_87: "#212121",
  BLUE_2: "#62B5E5",
  BLUE_3: "#0098F0",
  BLUE_4: "#0076A8",
  COOL_GRAY_11: "#53565A",
  DELOITTE_GREEN: "#86BC25",
  ERROR: "#DA291C",
  GREEN_1: "#E3E48D",
  GREEN_2: "#C4D600",
  GREEN_7: "#2C5234",
  TEAL_1: "#DDEFE8",
  TEAL_4: "#00ABAB",
  WARNING: "#FFCD00",
  WARNING_ALT: "#ED8B00",
};

export const THEME_LIGHT = "light";
export const THEME_DARK = "dark";

const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
const defaultTheme = darkThemeMq.matches ? THEME_DARK : THEME_LIGHT;

export const vuetify = createVuetify({
  components: {
    ...components,
    ...labsComponents,
  },
  directives,
  theme: {
    defaultTheme: defaultTheme,
    themes: {
      [THEME_LIGHT]: {
        dark: false,
        colors: {
          accent: DD_BRAND_COLOURS.TEAL_1,
          dark: DD_BRAND_COLOURS.BLACK_ALPHA_87,
          error: DD_BRAND_COLOURS.ERROR,
          info: DD_BRAND_COLOURS.BLUE_3,
          primary: DD_BRAND_COLOURS.TEAL_4,
          secondary: DD_BRAND_COLOURS.TEAL_1,
          success: DD_BRAND_COLOURS.DELOITTE_GREEN,
          warning: DD_BRAND_COLOURS.WARNING_ALT,
        },
      },
      [THEME_DARK]: {
        dark: true,
        colors: {
          accent: DD_BRAND_COLOURS.GREEN_7,
          dark: DD_BRAND_COLOURS.BLACK_ALPHA_87,
          error: DD_BRAND_COLOURS.ERROR,
          info: DD_BRAND_COLOURS.BLUE_2,
          primary: DD_BRAND_COLOURS.GREEN_1,
          secondary: DD_BRAND_COLOURS.GREEN_7,
          success: DD_BRAND_COLOURS.DELOITTE_GREEN,
          warning: DD_BRAND_COLOURS.WARNING,
        },
      },
    },
  },
});

export function getThemeString(theme: ThemeInstance) {
  return theme.global.current.value.dark ? "dark" : "light";
}
