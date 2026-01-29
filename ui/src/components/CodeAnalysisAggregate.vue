<template>
  <v-card>
    <v-card-title>{{ title }}</v-card-title>
    <v-card-subtitle>{{ subtitle }}</v-card-subtitle>

    <v-card-text>
      <div class="my-4">
        <WorkloadNames :defaults="workloadIds" @input="(w) => (workloadIds = w)" :operationState="operationState" />
      </div>
      <div class="my-4">
        <RepoGroups
          :defaults="repoGroupsInput"
          @input="(rg) => (repoGroupsInput = rg)"
          :operationState="operationState"
        />
      </div>
      <div v-if="individualRepos?.length" class="my-4">
        <v-combobox
          v-model="individualReposInput"
          label="Individual Repos"
          :hint="`default: ${individualRepos.join(',')}`"
          :disabled="runToggle"
          multiple
          small-chips
        />
      </div>
      <div class="my-4">
        <DatePicker v-model="startDate" :operationState="operationState" label="Start date" />
      </div>
      <div class="my-4">
        <DatePicker v-model="endDate" :operationState="operationState" label="End date" />
      </div>
      <div class="my-4">
        <v-checkbox
          v-model="aggregate"
          :disabled="runToggle"
          label="Aggregate results by repository group"
          hide-details
        />
      </div>
      <v-btn v-model:pressed="runToggle" :disabled="runToggle" color="primary" @click="runAggregate">
        {{ runToggleLabel }}
      </v-btn>
    </v-card-text>

    <v-container fluid v-if="formattedResultData?.length">
      <v-row>
        <v-col
          v-for="(result, index) in formattedResultData"
          :key="index"
          :cols="12"
          :sm="6"
          :md="4"
          :lg="3"
          :xl="2"
          class="d-flex"
          style="flex-direction: column"
        >
          <v-card class="flex-grow-1 d-flex" style="flex-direction: column">
            <v-sheet :color="result.variant">
              <v-card-title class="white--text tile-title">{{ result.name }}</v-card-title>
            </v-sheet>

            <div v-if="result.hasMetrics">
              <v-card-title class="text-h3">{{ formatDecimal(result.summary.coverage, 1) }}%</v-card-title>
              <v-card-subtitle
                ><span v-if="result.summary.coverage < result.previous.summary.coverage"
                  ><v-icon color="#F44336">mdi-arrow-down-bold</v-icon>{{ result.delta }}% change</span
                ><span v-else-if="result.summary.coverage > result.previous.summary.coverage"
                  ><v-icon color="#4CAF50">mdi-arrow-up-bold</v-icon>+{{ result.delta }}% change</span
                ><span v-else><v-icon color="#559bea">mdi-circle-medium</v-icon>No change</span></v-card-subtitle
              >
            </div>
            <div v-else>
              <v-card-title class="text-h6">No coverage data</v-card-title>
              <v-card-subtitle v-if="result.staleData"
                ><v-icon class="mr-1">mdi-alert</v-icon>{{ result.staleData }}</v-card-subtitle
              >
            </div>

            <v-card-text class="flex-grow-1">
              <span class="text--secondary">Number of projects: </span>
              <strong>{{ formatInteger(result.numProjects) }}</strong>

              <v-spacer />

              <span class="text--secondary">Total lines: </span>
              <strong>{{ formatInteger(result.summary.totalLines) }}</strong>

              <v-spacer />

              <span class="text--secondary">Total lines to cover: </span>
              <strong>{{ formatInteger(result.summary.totalLinesToCover) }}</strong>
            </v-card-text>

            <v-card-actions>
              <v-menu open-on-hover>
                <template v-slot:activator="{ props }">
                  <v-btn color="primary" v-bind="props">Repositories <v-icon>mdi-menu-down</v-icon></v-btn>
                </template>

                <v-list>
                  <v-list-item v-for="(item, index) in result.links" :key="index">
                    <v-list-item-title class="mr-3">{{ item.title }}</v-list-item-title>

                    <template v-slot:append>
                      <RepoLink :workload-id="item.workloadId" :repo-name="item.repoName" />
                      <v-btn
                        color="grey-darken-1"
                        density="compact"
                        variant="text"
                        :href="item.codeAnalysisUrl"
                        target="_blank"
                        icon="mdi-chart-line"
                        text="Code analysis component"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script lang="ts">
// @ts-nocheck
import axios from "@/utils/axios";
import DatePicker from "@/components/DatePicker.vue";
import { truncateDateOnly, getOffsetDate } from "@/utils/date";
import { CODE_ANALYSIS_AGGREGATE } from "@/utils/urls";
import { OperationState } from "@/utils/ui";
import RepoGroups from "@/components/inputs/RepoGroups.vue";
import WorkloadNames from "@/components/inputs/WorkloadNames.vue";
import type {
  CoverageSummary,
  CodeAnalysisAggregateResponse,
  VariantGroupCoverage,
  WorkloadRepoGroupCoverage,
} from "@/model/codeAnalysis";
import { formatDecimal, formatInteger } from "@/utils/metricDisplay";
import RepoLink from "@/components/info/RepoLink.vue";
import { convertVariantToColour } from "@/utils/colours";

type Data = {
  aggregate: boolean;
  formattedResultData: VariantGroupCoverage &
    {
      hasMetrics: boolean;
      staleData?: string;
      previous: WorkloadRepoGroupCoverage;
      delta: string;
      variant: string;
    }[];
  runToggle: boolean;
  runToggleLabel: string;
  workloads: string[];
  repoGroupsInput: string[];
  individualReposInput: string[];
  startDate: string;
  endDate: string;
};

export default {
  components: { RepoLink, WorkloadNames, RepoGroups, DatePicker },

  props: {
    workloads: {
      type: Array as () => string[],
      default: () => [],
    },
    repoGroups: {
      type: Array as () => string[],
      default: () => [],
    },
    individualRepos: {
      type: Array as () => string[],
      default: () => [],
    },
    subtitle: {
      type: String,
      default: () => "Summarise code quality metrics by repository group.",
    },
    title: {
      type: String,
      default: () => "Code quality metric summary",
    },
    aggregateRepos: {
      type: Boolean,
      default: () => true,
    },
    executeOnMount: {
      type: Boolean,
      default: () => false,
    },
  },

  data(): Data {
    return {
      aggregate: this.aggregateRepos,
      formattedResultData: [],
      runToggle: false,
      runToggleLabel: "Summarise metrics",
      workloadIds: this.workloads,
      repoGroupsInput: this.repoGroups,
      individualReposInput: this.individualRepos,
      startDate: truncateDateOnly(getOffsetDate(-30)),
      endDate: truncateDateOnly(new Date()),
    };
  },

  methods: {
    formatDecimal,
    formatInteger,
    async runAggregate(): Promise<void> {
      this.runToggle = true;
      this.runToggleLabel = "Summarising metrics...";
      try {
        const { data } = await axios.post(CODE_ANALYSIS_AGGREGATE, {
          workloads: this.workloadIds,
          repoGroups: this.repoGroupsInput,
          individualRepos: this.individualReposInput?.map((it) => {
            const entry = (it as string).split(":");
            return { workloadId: entry[0], repoName: entry[1] };
          }),
          aggregate: this.aggregate,
          startTime: new Date(this.startDate).getTime(),
          endTime: new Date(this.endDate).getTime(),
        });
        const aggregateResponse = data as CodeAnalysisAggregateResponse;

        this.formattedResultData = aggregateResponse.current
          .filter((current: VariantGroupCoverage) => current.numProjects > 0)
          .map((current) => {
            const previous: VariantGroupCoverage = aggregateResponse.previous.find(
              (prevData) => prevData.name === current.name,
            );

            const deltaDesc = formatDecimal(current.summary.coverage - previous.summary.coverage, 1);

            let staleData: CoverageSummary;
            if (current.variant === "no_data") {
              if (previous.variant != "no_data") {
                staleData = `Last coverage: ${previous.summary.coverage}%`;
              } else {
                staleData = "Last coverage unknown";
              }
            }

            const links = current.analysisLinks.map((sl) => {
              return {
                title: sl.title,
                workloadId: current.workloadId,
                repoName: sl.repoName,
                codeAnalysisUrl: sl.url,
              };
            });

            return {
              hasMetrics: current.summary.totalLinesToCover > 0,
              staleData,
              ...current,
              previous,
              delta: deltaDesc,
              variant: convertVariantToColour(current.variant),
              links,
            };
          });

        this.runToggleLabel = "Summarise metrics";
      } catch (e) {
        console.error(`Failed to summarise metrics: ${e}`);
        this.runToggleLabel = "Error";
      }
      this.runToggle = false;
    },
  },

  async mounted() {
    if (this.executeOnMount) {
      await this.runAggregate();
    }
  },

  computed: {
    operationState(): OperationState {
      return this.runToggle ? OperationState.Busy : OperationState.Idle;
    },
  },
};
</script>

<style scoped>
.tile-title {
  font-size: clamp(0.75rem, 2vw, 1.25rem) !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
  hyphens: auto !important;
  line-height: 1.2 !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
</style>
