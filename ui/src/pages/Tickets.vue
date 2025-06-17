<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items" />
          <h2 class="text-h2">Tickets</h2>
          <p>Bugs and incident tickets.</p>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>

  <v-container>
    <v-row>
      <v-col>
        <DynamicQuery
          title="Bugs"
          subtitle="How many bugs or defects were reported."
          :query-types="[QueryName.BugsNew]"
          :default-inputs="{
            workloads: workloadId ? [workloadId] : [],
          }"
          :execute-on-mount="executeImmediately"
          :summarise="[QueryName.BugsNew]"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <DynamicQuery
          title="Incidents"
          subtitle="How many production incidents occurred."
          :query-types="[QueryName.ProductionIncidents]"
          :default-inputs="{
            workloads: workloadId ? [workloadId] : [],
          }"
          :execute-on-mount="executeImmediately"
          :summarise="[QueryName.ProductionIncidents]"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import DynamicQuery from "@/components/DynamicQuery.vue";
import { QueryName } from "@/queries/queries";
import { Paths } from "@/router/paths";

const route = useRoute();

const { workloadId, executeImmediately: executeImmediatelyRaw } = route.query;
const executeImmediately = executeImmediatelyRaw === "true";
const singularWorkloadId =
  (Array.isArray(workloadId) ? workloadId[0] : workloadId) ?? undefined;

const items = computed(() => [
  {
    title: "Workloads",
    to: Paths.Workloads,
  },
  {
    title: singularWorkloadId ?? "",
    to: `${Paths.Workloads}/${singularWorkloadId ?? ""}`,
  },
  {
    title: "Bugs",
    to: `${Paths.Workloads}/bugs`,
  },
]);
</script>
