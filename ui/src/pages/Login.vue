<template>
  <v-container fill-height class="d-flex align-center justify-center">
    <v-card width="400" v-if="externalLogin">
      <v-card-title class="headline">Please wait</v-card-title>
      <v-card-text>Checking authentication status...</v-card-text>
      <v-card-text>
        <v-alert v-if="!!alert" :type="alert.type">{{ alert.message }}</v-alert>
        <v-infinite-scroll v-if="!alert" />
      </v-card-text>
    </v-card>
    <v-card width="400" v-if="!externalLogin">
      <v-form v-model="valid" @submit.prevent="onLogin">
        <v-card-text>
          <v-alert v-if="!!alert" :type="alert.type">{{ alert.message }}</v-alert>
          <v-text-field
            autocomplete="username"
            v-model="username"
            :rules="[rules.required]"
            label="User name"
            name="username"
            type="text"
          />
          <v-text-field
            autocomplete="current-password"
            v-model="password"
            :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            :rules="[rules.required]"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            name="password"
            @click:append="showPassword = !showPassword"
          />
          <v-btn :disabled="!valid" color="primary" type="submit"> Log in </v-btn>
        </v-card-text>
      </v-form>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { computed, defineComponent, getCurrentInstance, ref } from "vue";
import { useAuthStore } from "@/store/auth";
import { getErrorMessage } from "@/services/auth";
import { watch } from "vue";
import type { Router } from "vue-router";
import { getConfig } from "@/utils/config.ts";
import { logger } from "@/utils/logger.ts";

export default defineComponent({
  setup() {
    const router = getCurrentInstance()?.proxy?.$router;
    const authStore = useAuthStore();
    const valid = ref(null);
    const username = ref("");
    const password = ref("");
    const showPassword = ref(false);
    const externalLogin = ref(authStore.isExternalLogin);
    const authRequired = computed(() => getConfig().webConfig.auth.required ?? true);

    async function safeNavigateHome(router: Router) {
      await router?.isReady();
      const target = authStore.fetchAndClearDestination(router) || { name: "/" };
      router.push(target);
    }

    authStore.$subscribe(() => {
      if (authStore.isAuthenticated && router) {
        router.push(authStore.fetchAndClearDestination(router));
      }
    });

    watch(
      () => authStore.isAuthenticated,
      (isAuth) => {
        if (isAuth && router) {
          safeNavigateHome(router);
        }
      },
      { immediate: true }, // triggers if already authenticated when mounted
    );

    async function onLogin() {
      try {
        await authStore.login({
          username: username.value,
          password: password.value,
        });
      } catch (e) {
        console.error(e);
      }
    }

    if (!authRequired.value) {
      externalLogin.value = true;
      (async () => {
        try {
          const auth = getConfig().webConfig.auth;
          if (!auth) {
            console.error("No auth config found");
            return;
          }
          logger("Using provided credentials");
          await authStore.login({
            username: auth.provided?.user ?? "",
            password: auth.provided?.pass ?? "",
          });
        } catch (e) {
          console.error("Auto-login failed", e);
        }
      })();
    } else if (authStore.isExternalLogin) {
      externalLogin.value = true;
      (async () => {
        try {
          await authStore.checkAuthState();
        } catch (e) {
          console.error("Error checking authentication state", e);
        }
      })();
    }

    return {
      username,
      password,
      showPassword,
      externalLogin,
      rules: {
        required: (value: string) => !!value || "Required.",
      },
      valid,
      onLogin,
      alert: computed(() => getErrorMessage(authStore.status)),
    };
  },

  async mounted() {
    const authStore = useAuthStore();

    if (authStore.isExternalLogin) {
      try {
        await authStore.checkAuthState();
      } catch (e) {
        console.error("Error checking authentication state", e);
      }
    }
  },
});
</script>
