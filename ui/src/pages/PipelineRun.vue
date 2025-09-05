<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">Pipeline run</h2>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container v-if="error">
      <v-row>
        <v-col>
          <v-alert type="error">{{ error }}</v-alert>
        </v-col>
      </v-row>
    </v-container>

    <v-container>
      <v-row>
        <v-col>
          <run-details v-if="item" :item="item" />
          <v-skeleton-loader v-else type="card" height="200" />
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-card-title>Deployments</v-card-title>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <run-deployment v-if="item" :item="item" />
          <v-skeleton-loader v-else type="card" height="200" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import { Paths } from "@/router/paths";
import { fetchRunById } from "@/services/pipelines";
import RunDetails from "@/components/pipeline/RunDetails.vue";
import RunDeployment from "@/components/pipeline/RunDeployment.vue";
import { onMounted, ref } from "vue";
import type { RunWithMetadata } from "@/model/runs";

const route = useRoute();

const { runId, jobName, workloadId, stageId, branchName } = route.query;

const item = ref<RunWithMetadata>();
const error = ref<string>();

onMounted(async () => {
  try {
    item.value = await fetchRunById(workloadId as string, stageId as string, jobName as string, runId as string);
  } catch (e) {
    error.value = `Unable to find pipeline run. ${e}`;
  }
});

const items = [
  {
    title: "Workloads",
    to: Paths.Workloads,
  },
  {
    title: workloadId as string,
    to: `${Paths.Workloads}/${workloadId}`,
  },
  {
    title: "CI/CI pipeline",
    to: `${Paths.WorkloadPipelineRuns}?workloadId=${workloadId}&branchName=${branchName}&executeImmediately=true`,
  },
  {
    title: "Run",
    to: `${Paths.WorkloadPipelineRun}?workloadId=${workloadId}&branchName=${branchName}jobName=${jobName}&runId=${workloadId}`,
  },
];
</script>
