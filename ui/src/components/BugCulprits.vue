<template>
  <v-card>
    <v-card-title>Bug culprit files</v-card-title>
    <v-card-subtitle>Identify files that are potential bug culprits.</v-card-subtitle>

    <v-card-text v-if="!!isError">
      <v-alert type="error">Failed to analyse {{ workload }}: {{ error }}</v-alert>
    </v-card-text>

    <v-card-text v-if="data?.length === 0">
      <v-alert type="info">No culprits found for {{ workload?.toLocaleUpperCase() }}</v-alert>
    </v-card-text>

    <v-card-text>
      <v-row>
        <v-col cols="6" md="4" lg="3">
          <workload-names
            :defaults="workload as any"
            :multiSelect="false"
            :includeAllOption="false"
            @input="onWorkloadNamesChanged"
            :operationState="isFetching ? OperationState.Busy : OperationState.Idle"
          />
        </v-col>
        <v-col cols="6" md="4" lg="3">
          <v-text-field label="Range" prefix="Last" v-model.number="range" suffix="days" :disabled="isFetching" />
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-text>
      <v-alert
        max-width="40em"
        text="This analysis links project management issues to pull requests and quality metrics. Analysis may take some time."
        type="info"
        variant="outlined"
        class="mt-n6"
      ></v-alert>
    </v-card-text>

    <v-card-actions>
      <v-btn
        v-model:pressed="isFetching"
        :disabled="!workload || isFetching"
        variant="elevated"
        color="primary"
        class="ml-2"
        @click="refetch"
      >
        {{ isFetching ? "Analysing..." : "Run analysis" }}
      </v-btn>
    </v-card-actions>

    <v-spacer />

    <v-card-text>
      <section v-for="(culprit, index) in data" :key="index">
        <h4>
          Analysis of {{ culprit.componentName
          }}<RepoLink :workload-id="culprit.workloadId" :repo-name="culprit.repoName" />
        </h4>
        <v-data-table
          v-if="culprit.pathData.length > 0"
          :headers="headers"
          :items="culprit.pathData"
          :items-per-page="5"
        />
        <p class="text--secondary" v-if="culprit.pathData.length === 0">No culprits.</p>
      </section>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import WorkloadNames from "@/components/inputs/WorkloadNames.vue";
import RepoLink from "@/components/info/RepoLink.vue";
import { useBugCulprit } from "@/vue-queries/bug-culprit";
import { OperationState } from "@/utils/ui";

const props = withDefaults(
  defineProps<{
    executeOnMount: boolean;
    workload?: string;
  }>(),
  {
    executeOnMount: false,
    workload: undefined,
  },
);

const range = ref(30);
const workload = ref(props.workload ?? null);

const headers = [
  {
    title: "File path",
    key: "path",
  },
  {
    title: "Bug-related changes",
    key: "count",
  },
  {
    title: "Tickets",
    key: "issueIds",
  },
  {
    title: "Test coverage",
    key: "coverage",
  },
];

const { data, error, isError, isFetching, refetch } = useBugCulprit({
  daysBack: range,
  workload,
});

function onWorkloadNamesChanged(rawNewWorkload: string | string[] | null) {
  const newWorkload = rawNewWorkload as string | null;
  workload.value = newWorkload?.length ? newWorkload : null;
}

onMounted(() => {
  if (props.executeOnMount) {
    refetch();
  }
});
</script>
