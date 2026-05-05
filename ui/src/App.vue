<template>
  <v-app>
    <Dialog />
    <Toast />
    <NavBar />

    <v-main>
      <FrontendUpgradeBanner />
      <router-view />
    </v-main>

    <Footer />
  </v-app>
</template>

<script lang="ts" setup>
import Dialog from "@/components/Dialog.vue";
import Toast from "@/components/Toast.vue";
import NavBar from "./components/NavBar.vue";
import FrontendUpgradeBanner from "./components/FrontendUpgradeBanner.vue";
import Footer from "./components/Footer.vue";
import { useInactivityDialog } from "@/composables/inactivity-checker.ts";

useInactivityDialog();
</script>
