<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">Code analysis</h2>
            <p>Aggregated code quality metrics.</p>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <code-analysis-aggregate
            :aggregate-repos="false"
            :execute-on-mount="executeImmediately"
            :workloads="[workloadId]"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import { Paths } from "@/router/paths";
import CodeAnalysisAggregate from "@/components/CodeAnalysisAggregate.vue";

const route = useRoute();

const { workloadId: workloadIdRaw, executeImmediately: executeImmediatelyRaw } =
  route.query;
const workloadId = workloadIdRaw as string;
const executeImmediately = executeImmediatelyRaw === "true";

const items = [
  {
    title: "Workloads",
    to: Paths.Workloads,
  },
  {
    title: workloadId,
    to: `${Paths.Workloads}/${workloadId}`,
  },
  {
    title: "Code Quality",
    to: `${Paths.Workloads}/code-quality?workloadId=${workloadId}`,
  },
];
</script>
