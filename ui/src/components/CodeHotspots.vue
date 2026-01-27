<template>
  <v-card>
    <v-card-title>Code hotspots</v-card-title>
    <v-card-subtitle>Identify files frequently changed in relation to project issues.</v-card-subtitle>

    <v-card-text v-if="!!isError">
      <v-alert type="error">{{ error?.message }}</v-alert>
    </v-card-text>

    <v-card-text v-if="data?.length === 0">
      <v-alert type="info">No hotspots found for {{ workload?.toLocaleUpperCase() }}</v-alert>
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
          <DatePicker
            v-model="startDateValue"
            label="Start date"
            :operation-state="isFetching ? OperationState.Busy : OperationState.Idle"
          />
        </v-col>
        <v-col cols="6" md="4" lg="3">
          <v-select
            v-model="issueTypes"
            :items="availableIssueTypes ?? []"
            label="Issue types"
            hint="Select issue types to filter by. Leave empty to use all configured types."
            multiple
            chips
            clearable
            :disabled="isFetching || !workload"
            :loading="isFetchingIssueTypes"
          />
        </v-col>
        <v-col cols="6" md="4" lg="3">
          <v-btn-toggle v-model="viewMode" mandatory color="primary" variant="outlined">
            <v-btn value="table" :disabled="!hasData">
              <v-icon start>mdi-table</v-icon>
              Table
            </v-btn>
            <v-btn value="heatmap" :disabled="!hasData">
              <v-icon start>mdi-view-grid</v-icon>
              Heatmap
            </v-btn>
          </v-btn-toggle>
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-text>
      <v-alert
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

    <v-card-text v-if="hasData" class="pt-0">
      <v-expansion-panels variant="accordion" class="mt-2">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon start>mdi-information-outline</v-icon>
            Understanding the results
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div class="text-body-2">
              <p class="mb-5">
                <strong>Changes:</strong> The number of times a file was modified across all pull requests linked to the
                selected issues. A higher count indicates a file that is frequently touched when resolving issues.
              </p>
              <p class="mb-5">
                <strong>Coverage:</strong> The test coverage percentage for the file from your code analysis tool (e.g.,
                SonarQube). Shows what percentage of the code in that file is covered by tests.
              </p>
              <p class="mb-0">
                <strong>Linked Issues:</strong> The specific issues (tickets) whose associated pull requests modified
                this file. Click on any tile or table row to see the full list.
              </p>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>

    <v-card-text>
      <section v-for="(culprit, index) in data" :key="index">
        <h4>
          Analysis of {{ culprit.componentName
          }}<RepoLink :workload-id="culprit.workloadId" :repo-name="culprit.repoName" />
        </h4>

        <!-- Table View -->
        <v-data-table
          v-if="viewMode === 'table' && culprit.pathData.length > 0"
          :headers="headers"
          :items="culprit.pathData"
          :items-per-page="5"
        >
          <template #item.issueIds="{ item }">
            <span v-for="(link, linkIndex) in item.issueLinks" :key="link.id">
              <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.id }}</a>
              <span v-if="linkIndex < item.issueLinks.length - 1">, </span>
            </span>
          </template>
        </v-data-table>

        <!-- Heatmap View -->
        <TreemapChart
          v-if="viewMode === 'heatmap' && culprit.pathData.length > 0"
          :series="getTreemapSeries(culprit)"
          :height="calculateHeatmapHeight(culprit.pathData.length)"
        />

        <p class="text--secondary" v-if="culprit.pathData.length === 0">No hotspots.</p>
      </section>
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import WorkloadNames from "@/components/inputs/WorkloadNames.vue";
import RepoLink from "@/components/info/RepoLink.vue";
import DatePicker from "@/components/DatePicker.vue";
import TreemapChart from "@/components/charts/TreemapChart.vue";
import { useCodeHotspots, type RepoData } from "@/vue-queries/code-hotspots";
import { useIssueTypes } from "@/vue-queries/issue-types";
import { OperationState } from "@/utils/ui";
import { getOffsetDate } from "@/utils/date";
import { formatISO } from "date-fns";

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

const startDateValue = ref<Date>(getOffsetDate(-30));
const startDate = computed(() => formatISO(startDateValue.value, { representation: "date" }));
const workload = ref(props.workload ?? null);
const issueTypes = ref<string[] | undefined>(undefined);
const viewMode = ref<"table" | "heatmap">("heatmap");

// Fetch available issue types when workload changes
const { data: availableIssueTypes, isFetching: isFetchingIssueTypes } = useIssueTypes(workload);

// Reset selected issue types when workload changes
watch(workload, () => {
  issueTypes.value = undefined;
});

const headers = [
  {
    title: "File path",
    key: "path",
  },
  {
    title: "Issue-related changes",
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

const { data, error, isError, isFetching, refetch } = useCodeHotspots({
  startDate,
  workload,
  issueTypes,
});

const hasData = computed(() => data.value && data.value.length > 0);

/**
 * Extracts the filename from a full path for display in the heatmap
 */
function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

/**
 * Transforms RepoData into series format for the treemap chart
 */
function getTreemapSeries(culprit: RepoData) {
  return [
    {
      name: culprit.componentName,
      data: culprit.pathData.map((item) => ({
        x: getFileName(item.path),
        y: item.count,
        meta: {
          fullPath: item.path,
          coverage: item.coverage,
          issueIds: item.issueIds,
          issueLinks: item.issueLinks,
        },
      })),
    },
  ];
}

/**
 * Calculates an appropriate height for the heatmap based on number of items
 */
function calculateHeatmapHeight(itemCount: number): number {
  const minHeight = 300;
  const maxHeight = 600;
  const heightPerItem = 40;
  return Math.min(maxHeight, Math.max(minHeight, itemCount * heightPerItem));
}

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
