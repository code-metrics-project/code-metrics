import { create } from "zustand";
import { persist } from "zustand/middleware";

const STORAGE_KEY = "codemetrics-theme-preference";

export const THEME_LIGHT = "light";
export const THEME_DARK = "dark";

const systemThemes = [THEME_DARK, THEME_LIGHT] as const;
export const themes = ["auto", ...systemThemes] as const;
type SystemTheme = (typeof systemThemes)[number];
export type Theme = (typeof themes)[number];

interface ThemeState {
  systemTheme: SystemTheme;
  theme: Theme;
}

interface ThemeActions {
  changeSystemTheme: (newTheme: SystemTheme) => void;
  changeTheme: (newTheme: Theme) => void;
  uiTheme: () => string;
}

function updateDocumentTheme(theme: string) {
  if (theme === THEME_DARK) {
    document.documentElement.classList.add(THEME_DARK);
  } else {
    document.documentElement.classList.remove(THEME_DARK);
  }
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      systemTheme: THEME_LIGHT,
      theme: "auto",

      changeSystemTheme: (newTheme: SystemTheme) => {
        set({ systemTheme: newTheme });
      },

      changeTheme: (newTheme: Theme) => {
        set({ theme: newTheme });
        updateDocumentTheme(get().uiTheme());
      },

      uiTheme: () => {
        const state = get();
        switch (state.theme) {
          case "auto":
            return state.systemTheme === THEME_DARK ? THEME_DARK : THEME_LIGHT;
          case "dark":
            return THEME_DARK;
          case "light":
          default:
            return THEME_LIGHT;
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

/**
 * Initialize theme watcher for system preference changes.
 * Call this once in your app's entry point.
 * Returns a cleanup function to remove event listeners.
 */
export function initThemeWatcher() {
  const themeStore = useThemeStore.getState();

  function setTheme(mq: MediaQueryList | MediaQueryListEvent) {
    if (mq.matches) {
      themeStore.changeSystemTheme(THEME_DARK);
    } else {
      themeStore.changeSystemTheme(THEME_LIGHT);
    }
  }

  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  setTheme(darkThemeMq);
  darkThemeMq.addEventListener("change", setTheme);

  // Update document theme initially
  updateDocumentTheme(themeStore.uiTheme());

  // Subscribe to store changes
  const unsubscribe = useThemeStore.subscribe((state) => {
    updateDocumentTheme(state.uiTheme());
  });

  // Return cleanup function (though for app-level initialization, cleanup is typically not needed)
  return () => {
    darkThemeMq.removeEventListener("change", setTheme);
    unsubscribe();
  };
}
