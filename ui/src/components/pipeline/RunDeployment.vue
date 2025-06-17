<template>
  <v-card v-if="!runRows.length">
    <v-alert type="info">Unable to find deployments for this run.</v-alert>
  </v-card>
  <v-card v-for="runRow in runRows" :key="runRow.key">
    <v-card-title>{{ runRow.title }}</v-card-title>
    <v-card-subtitle
      ><span class="run-row-issue">
        <v-icon
          v-if="runRow.result === RunResult.Succeeded"
          color="green"
          class="mr-1"
          >mdi-circle</v-icon
        >
        <v-icon
          v-else-if="runRow.result === RunResult.Aborted"
          color="orange"
          class="mr-1"
          >mdi-circle</v-icon
        >
        <v-icon
          v-else-if="runRow.result === RunResult.Failed"
          color="red"
          class="mr-1"
          >mdi-circle</v-icon
        >
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
          <td>Repository</td>
          <td>{{ runRow.repo }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>
<script setup lang="ts">
import { RunResult, type RunWithMetadata } from "@/model/runs";
import { convertRunToRow, lookupDeploymentRuns } from "@/services/pipelines";
import { run } from "vue-tsc";

type TProps = {
  item: RunWithMetadata;
};

const props = defineProps<TProps>();

const deployments = await lookupDeploymentRuns(props.item);
const runRows = deployments.map((d) => convertRunToRow(d));
</script>
