<template>
  <div>
    <v-app-bar app color="dark">
      <router-link :to="Paths.Home">
        <v-img
          alt="Code Metrics logo"
          class="shrink ml-3 mr-2"
          contain
          :src="`/assets/img/codemetrics_small_title.png`"
          transition="scale-transition"
          width="200"
        />
      </router-link>

      <v-spacer />

      <div class="d-none d-lg-block" v-if="isAuthenticated" nav dense>
        <v-btn :to="Paths.Home">{{ t("nav.home") }}</v-btn>
        <v-btn :to="Paths.Program">{{ t("nav.program") }}</v-btn>
        <v-btn :to="Paths.Workloads">{{ t("nav.workload") }}</v-btn>
        <v-btn :to="Paths.NewQuery">{{ t("nav.newQuery") }}</v-btn>
        <v-btn :to="Paths.Explore">{{ t("nav.explore") }}</v-btn>
        <v-btn v-if="isAuthenticated && authRequired" @click.prevent="onLogout">{{ t("nav.logout") }}</v-btn>
      </div>

      <template v-slot:append>
        <ThemeSelector />
        <v-app-bar-nav-icon v-if="isAuthenticated" class="d-block d-lg-none" @click.stop="drawer = !drawer">
          <v-icon>mdi-menu</v-icon>
          <span class="d-sr-only">Open main navigation</span>
        </v-app-bar-nav-icon>
      </template>
    </v-app-bar>

    <v-navigation-drawer v-if="isAuthenticated" v-model="drawer" absolute right temporary>
      <v-list nav dense>
        <v-list-item role="option" :to="Paths.Home">{{ t("nav.home") }}</v-list-item>
        <v-list-item role="option" :to="Paths.Program">{{ t("nav.program") }}</v-list-item>
        <v-list-item role="option" :to="Paths.Workloads">{{ t("nav.workload") }}</v-list-item>
        <v-list-item role="option" :to="Paths.NewQuery">{{ t("nav.newQuery") }}</v-list-item>
        <v-list-item role="option" :to="Paths.Explore">{{ t("nav.explore") }}</v-list-item>
        <v-list-item role="option" v-if="isAuthenticated && authRequired" @click.prevent="onLogout">{{
          t("nav.logout")
        }}</v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import ThemeSelector from "./ThemeSelector.vue";
import { useAuthStore } from "@/store/auth";
import { Paths } from "@/router/paths";
import { getConfig } from "@/utils/config.ts";

const { t } = useI18n();
const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated);
const authRequired = computed(() => getConfig().webConfig.auth.required ?? true);

async function onLogout() {
  await authStore.logout();
}
const drawer = ref(false);
</script>
