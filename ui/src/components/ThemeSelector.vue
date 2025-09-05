<template>
  <v-btn size="small" @click.prevent="onClickTheme">
    <v-icon>{{ getIcon(themeStore.theme) }}</v-icon>
    <span class="d-sr-only">Toggle theme</span>
  </v-btn>
</template>

<script lang="ts" setup>
import { type Theme, themes, useThemeStore, useThemeWatcher } from "@/store/theme";

useThemeWatcher();

const themeStore = useThemeStore();

function getIcon(theme: Theme) {
  if (theme === "dark") {
    return "mdi-weather-night";
  }
  if (theme === "light") {
    return "mdi-weather-sunny";
  }
  return "mdi-laptop";
}

function onClickTheme() {
  const currentIndex = themes.indexOf(themeStore.theme);
  const newIndex = currentIndex >= themes.length - 1 ? 0 : currentIndex + 1;
  const newTheme = themes[newIndex];
  themeStore.changeTheme(newTheme);
}
</script>
