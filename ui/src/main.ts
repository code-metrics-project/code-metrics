import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import VueApexCharts from "vue3-apexcharts";
import { createI18n } from "vue-i18n";
import App from "@/App.vue";
import AppUnavailable from "@/AppUnavailable.vue";
import messages from "./i18n";
import router from "@/router";
import "@/assets/css/styles.scss";
import { setApiBaseUrl } from "@/utils/urls";
import { registerQueries } from "@/queries/queries";
import { fetchSystemBootstrap, fetchWebConfig } from "@/utils/config";
import { setLogLevel } from "@/utils/logger";
import { vuetify } from "./plugins/vuetify";

export const pinia = createPinia();

const i18n = createI18n({
  legacy: false,
  locale: "en-gb",
  messages,
});

async function main() {
  try {
    const config = await fetchWebConfig();
    setApiBaseUrl(config.apiBaseUrl);
    setLogLevel(config.logLevel);
    await fetchSystemBootstrap();
    registerQueries();
  } catch (e) {
    createApp(AppUnavailable).use(vuetify).mount("#app");
    return;
  }

  createApp(App)
    .use(VueQueryPlugin)
    .use(pinia)
    .use(router)
    .use(i18n)
    .use(VueApexCharts)
    .use(vuetify)
    .mount("#app");
}

main();
