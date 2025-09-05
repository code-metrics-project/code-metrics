<template>
  <v-card>
    <v-card-title>{{ runRow.title }}</v-card-title>
    <v-card-subtitle
      ><span class="run-row-issue">
        <v-icon v-if="runRow.result === RunResult.Succeeded" color="green" class="mr-1">mdi-check-circle</v-icon>
        <v-icon v-else-if="runRow.result === RunResult.Aborted" color="orange" class="mr-1">mdi-minus-circle</v-icon>
        <v-icon v-else-if="runRow.result === RunResult.Failed" color="red" class="mr-1">mdi-close-circle</v-icon>
        <v-icon v-else color="grey" class="mr-1">mdi-circle</v-icon> </span
      >{{ runRow.result }}</v-card-subtitle
    >

    <v-table>
      <tbody>
        <tr>
          <td>Started</td>
          <td>{{ new Date(runRow.date).toLocaleString() }}</td>
        </tr>
        <tr>
          <td>Duration</td>
          <td>{{ humaniseDuration(runRow.duration) }}</td>
        </tr>
        <tr>
          <td>Repository</td>
          <td>{{ runRow.repo }}</td>
        </tr>
      </tbody>
    </v-table>
    <v-card-actions>
      <a
        class="v-btn v-btn--slim v-theme--deloittedigitaluk text-primary v-btn--density-default v-btn--size-default v-btn--variant-text"
        :href="runUrl"
        target="_blank"
        >Open pipeline run</a
      >
    </v-card-actions>
  </v-card>
</template>
<script setup lang="ts">
import { RunResult, type RunWithMetadata } from "@/model/runs";
import { convertRunToRow } from "@/services/pipelines";
import { humaniseDuration } from "@/utils/date";
import { PIPELINE_RUN_REDIRECT } from "@/utils/urls";
import { getConfig } from "@/utils/config";
import { useAuthStore } from "@/store/auth";

type TProps = {
  item: RunWithMetadata;
};

const props = defineProps<TProps>();

const runRow = convertRunToRow(props.item);

const authStore = useAuthStore();
const runUrl = `${getConfig().webConfig.apiBaseUrl}${PIPELINE_RUN_REDIRECT}?workloadId=${runRow.workloadId}&stageId=${runRow.stageId}&runId=${runRow.id}&jobName=${runRow.job}&token=${authStore.tokens?.accessToken}`;
</script>
