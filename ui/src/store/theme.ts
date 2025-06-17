import { THEME_DARK, THEME_LIGHT } from "@/plugins/vuetify";
import { defineStore } from "pinia";
import { useTheme } from "vuetify";

const STORAGE_KEY = "codemetrics-theme-preference";

const systemThemes = ["dark", "light"] as const;
export const themes = ["auto", ...systemThemes] as const;
type SystemTheme = (typeof systemThemes)[number];
export type Theme = (typeof themes)[number];

type ThemeState = {
  systemTheme?: SystemTheme;
  theme: Theme;
};

function isTheme(maybeTheme: unknown): maybeTheme is Theme {
  return typeof maybeTheme === "string" && themes.includes(maybeTheme as Theme);
}

function getInitialState(): Theme {
  const storedTheme: unknown = window.localStorage.getItem(STORAGE_KEY);

  if (isTheme(storedTheme)) {
    return storedTheme;
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return "light";
}

export const useThemeStore = defineStore("theme", {
  state: (): ThemeState => ({
    systemTheme: undefined,
    theme: getInitialState(),
  }),

  actions: {
    changeSystemTheme(newTheme: SystemTheme) {
      this.systemTheme = newTheme;
    },
    changeTheme(newTheme: Theme) {
      this.theme = newTheme;
      window.localStorage.setItem(STORAGE_KEY, newTheme);
    },
  },

  getters: {
    uiTheme(state) {
      switch (state.theme) {
        case "auto":
          return state.systemTheme === "dark" ? THEME_DARK : THEME_LIGHT;
        case "dark":
          return THEME_DARK;
        case "light":
        default:
          return THEME_LIGHT;
      }
    },
  },
});

export function useThemeWatcher() {
  const themeStore = useThemeStore();

  function setTheme(mq: MediaQueryList | MediaQueryListEvent) {
    if (mq.matches) {
      themeStore.changeSystemTheme("dark");
    } else {
      themeStore.changeSystemTheme("light");
    }
  }

  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  setTheme(darkThemeMq);
  darkThemeMq.addEventListener("change", setTheme);

  const theme = useTheme();
  function setUserTheme() {
    theme.global.name.value = themeStore.uiTheme;
  }
  setUserTheme();
  themeStore.$subscribe(setUserTheme);
}
