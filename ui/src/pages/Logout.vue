<template>
  <v-container fill-height class="d-flex align-center justify-center">
    <v-card width="400">
      <v-card-title class="headline">You're logged out</v-card-title>
      <v-card-text>You are logged out of CodeMetrics.</v-card-text>
      <v-card-text>
        <v-alert v-if="!!alert" :type="alert.type" class="mb-3">{{ alert.message }}</v-alert>
        <v-btn color="primary" :to="Paths.Login">Log in</v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import { getErrorMessage } from "@/services/auth";
import { Paths } from "@/router/paths";

export default defineComponent({
  computed: {
    Paths() {
      return Paths;
    },
  },
  setup() {
    return {
      alert: computed(() => {
        const error = new URLSearchParams(document.location.search).get("error");
        return getErrorMessage(error);
      }),
    };
  },
});
</script>
