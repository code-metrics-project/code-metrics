<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">Saved Dashboards</h2>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
  <v-container class="grey-lighten-3">
    <div v-if="error">
      <p v-if="error === Error.No_Data">No dashboards available.</p>
    </div>

    <div v-else>
      <v-progress-linear v-if="!availableDashboards" indeterminate />
      <v-select
        v-if="availableDashboards"
        :items="availableDashboards"
        label="Dashboard"
        item-text="name"
        item-value="id"
        v-model="chosenDashboardName"
      />
      <Dashboard v-if="chosenDashboard" :dashboard="chosenDashboard" />
    </div>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, watchEffect } from "vue";
import { Paths } from "@/router/paths";
import Dashboard from "@/components/dashboard/Dashboard.vue";
import { getDashboard, getDashboards } from "@/queries/dashboards";

enum Error {
  No_Data = "no-data",
}

const availableDashboards = ref();
const chosenDashboardName = ref<string>();
const chosenDashboard = ref();
const error = ref<Error>();

(async function () {
  const allDashboards = await getDashboards();
  availableDashboards.value = allDashboards.data.map(({ id, name }) => ({
    value: id,
    title: name,
  }));
  if (!availableDashboards.value.length) {
    error.value = Error.No_Data;
    return;
  }
  chosenDashboardName.value = availableDashboards.value[0].title;
})();

watchEffect(async () => {
  if (!chosenDashboardName.value) return;
  const chosenDashboardId = availableDashboards.value.find(
    ({ title }: { title: string }) => title === chosenDashboardName.value,
  );
  const result = await getDashboard(chosenDashboardId.value);
  chosenDashboard.value = result.data;
});

const items = [
  {
    title: "Explore",
    to: Paths.Explore,
  },
  {
    title: "Saved Dashboards",
    to: Paths.SavedDashboards,
  },
];
</script>
