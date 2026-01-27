<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">Analysis</h2>
          <p>Combine sources.</p>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>

  <v-container>
    <v-row>
      <v-col>
        <CodeHotspots
          v-if="!Array.isArray(workloadId)"
          :workload="workloadId as string"
          :executeOnMount="executeImmediately"
        />
        <p v-else>Multiple workloads provided in query, please provide just one.</p>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <DynamicQuery
          title="Bugs vs. Coverage"
          subtitle="Correlates bugs vs. coverage."
          :query-types="[QueryName.BugsNew, QueryName.CodeCoverage]"
          :default-inputs="{ workloads: workloadId ? [workloadId] : [] }"
        />
      </v-col>
    </v-row>

    <BehindFlag feature="predictions">
      <v-row>
        <v-col>
          <Predictions />
        </v-col>
      </v-row>
    </BehindFlag>
  </v-container>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import DynamicQuery from "@/components/DynamicQuery.vue";
import Predictions from "@/components/Predictions.vue";
import CodeHotspots from "@/components/CodeHotspots.vue";
import { QueryName } from "@/queries/queries";
import BehindFlag from "@/components/BehindFlag.vue";
import { Paths } from "@/router/paths";

const route = useRoute();

const { workloadId, executeImmediately: executeImmediatelyRaw } = route.query;
const executeImmediately = executeImmediatelyRaw === "true";
const singularWorkloadId = (Array.isArray(workloadId) ? workloadId[0] : workloadId) ?? undefined;

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
    title: "Analysis",
    to: `${Paths.Workloads}/${singularWorkloadId ?? ""}`,
  },
]);
</script>
