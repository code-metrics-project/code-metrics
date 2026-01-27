<template>
  <v-card>
    <v-card-title>Pipeline runs</v-card-title>
    <v-card-subtitle>List pipeline runs by workload and repository.</v-card-subtitle>
    <v-card-text>
      <v-row>
        <v-col cols="9">
          <v-row>
            <v-col cols="12">
              <workload-names :defaults="workloads" @input="(w) => (workloads = w)" :operationState="operationState" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <job-groups
                :defaults="jobGroupsInput"
                @input="(rg) => (jobGroupsInput = rg)"
                :operationState="operationState"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <DatePicker v-model="startDateInput" label="Start date" :operationState="operationState" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <DatePicker v-model="endDateInput" label="End date" :operationState="operationState" />
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <pipeline-stage
                :defaults="stageInput"
                @input="(s) => (stageInput = s)"
                :operationState="operationState"
              />
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="3">
          <v-row>
            <v-col>
              <v-card-subtitle class="pl-0 mt-4>"> Display </v-card-subtitle>
              <v-checkbox v-model="showRepository" label="Show repository" :disabled="busy" class="my-0" />
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-btn :disabled="busy" @click="fetchRuns" color="primary" class="mr-2">
            {{ fetchLabel }}
          </v-btn>
          <v-progress-circular v-if="busy" :model-value="progress" color="primary" :width="4" :size="32" class="mr-3" />
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-title>
      Runs
      <v-row>
        <v-col />
        <v-col>
          <v-spacer />
          <v-text-field v-model="search" append-icon="mdi-magnify" label="Search" single-line hide-details />
        </v-col>
      </v-row>
    </v-card-title>

    <v-sheet color="grey-lighten-4" v-if="summary">
      <v-card-item>
        <v-card-subtitle class="subtitle-1 font-weight-bold">Summary</v-card-subtitle>
      </v-card-item>
      <v-card-text class="run-summary">
        <span class="font-weight-medium">{{ summary.total }} runs</span>
        <span class="ml-4"><v-icon color="red" class="mr-1">mdi-close-circle</v-icon>Failed: {{ summary.failed }}</span>
        <span class="ml-4"
          ><v-icon color="green" class="mr-1">mdi-check-circle</v-icon>Succeeded: {{ summary.succeeded }}</span
        >
        <span class="ml-4"
          ><v-icon color="orange" class="mr-1">mdi-minus-circle</v-icon>Aborted: {{ summary.aborted }}</span
        >
      </v-card-text>
    </v-sheet>

    <v-data-table
      :headers="headers"
      :items="runs"
      item-key="key"
      :sort-by="[{ key: 'date', order: 'asc' }]"
      :sort-desc="[true]"
      :footer-props="{
        'items-per-page-options': [10, 25, 50, -1],
      }"
      :items-per-page="25"
      :search="search"
      class="elevation-1"
    >
      <template v-slot:[`item.title`]="{ item }">
        <v-btn
          variant="flat"
          class="text-none px-0"
          :to="`${Paths.WorkloadPipelineRun}?workloadId=${item.workloadId}&stageId=${item.stageId}&branchName=${branchName}&jobName=${item.job}&runId=${item.id}`"
          >{{ item.title }}</v-btn
        >
      </template>
      <template v-slot:[`item.date`]="{ item }">
        {{ new Date(item.date).toLocaleString() }}
      </template>
      <template v-slot:[`item.repo`]="{ item }">
        <span class="title__content">{{ item.repo }}</span>
      </template>
      <template v-slot:[`item.duration`]="{ item }">
        <span class="title__content">{{ humaniseDuration(item.duration) }}</span>
      </template>
      <template v-slot:[`item.result`]="{ item }">
        <span class="run-row-issue"
          ><v-icon v-if="item.result === RunResult.Succeeded" color="green" class="mr-1">mdi-check-circle</v-icon>
          <v-icon v-else-if="item.result === RunResult.Aborted" color="orange" class="mr-1">mdi-minus-circle</v-icon>
          <v-icon v-else-if="item.result === RunResult.Failed" color="red" class="mr-1">mdi-close-circle</v-icon
          ><v-icon v-else color="grey" class="mr-1">mdi-circle</v-icon>
          {{ item.result }}
        </span>
      </template>
    </v-data-table>
  </v-card>
</template>

<script lang="ts">
// @ts-nocheck
import DatePicker from "@/components/DatePicker.vue";
import { getRelativeDate, humaniseDuration, walkDateRangeBatched } from "@/utils/date";
import WorkloadNames from "@/components/inputs/WorkloadNames.vue";
import JobGroups from "@/components/inputs/JobGroups.vue";
import { OperationState } from "@/utils/ui";
import { logger } from "@/utils/logger";
import { fetchForDateRange, type RunRow } from "@/services/pipelines";
import { RunResult } from "@/model/runs";
import { Paths } from "@/router/paths";
import { formatDuration } from "date-fns";
import PipelineStage from "@/components/inputs/PipelineStage.vue";
import { getFirstPipelineStage } from "@/queries/config";

const API_BATCH_DAYS = 7;

const TABLE_HEADERS = [
  {
    title: "Workload",
    align: "start",
    sortable: true,
    key: "workloadId",
  },
  {
    title: "Job",
    align: "start",
    sortable: false,
    key: "title",
  },
  {
    title: "Date",
    align: "start",
    sortable: true,
    key: "date",
  },
  {
    title: "Repository",
    align: "start",
    sortable: true,
    key: "repo",
  },
  {
    title: "Duration",
    align: "start",
    sortable: true,
    key: "duration",
  },
  {
    title: "Outcome",
    align: "start",
    sortable: true,
    key: "result",
  },
];

type RunSummary = {
  total: number;
  failed: number;
  tasks: number;
  succeeded: number;
  aborted: number;
};

export default {
  components: { PipelineStage, JobGroups, WorkloadNames, DatePicker },

  props: {
    workload: {
      type: String,
      default: null,
    },
    jobGroups: {
      type: Array,
      default: () => [],
    },
    jobNames: {
      type: Array,
      default: () => [],
    },
    repoNames: {
      type: Array,
      default: () => [],
    },
    stageId: {
      type: String,
      default: null,
    },
    branchName: {
      type: String,
      default: null,
    },
    startDate: {
      type: String,
      default: null,
    },
    endDate: {
      type: String,
      default: null,
    },
    executeOnMount: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      headers: TABLE_HEADERS,
      rawRuns: [] as RunRow[],
      runs: [] as RunRow[],
      search: "",
      showRepository: false,
      fetchLabel: "Show runs",
      startDateInput: this.startDate ?? getRelativeDate(new Date(), 0),
      endDateInput: this.endDate ?? getRelativeDate(new Date(), 0),
      workloads: [] as string[],
      jobGroupsInput: this.jobGroups,
      jobNamesInput: this.jobNames,
      repoNamesInput: this.repoNames,
      stageInput: this.stageId?.length ? this.stageId : getFirstPipelineStage(),
      branch: this.branchName,
      busy: false,
      progress: 0,
      summary: null as RunSummary | null,
    };
  },

  computed: {
    Paths() {
      return Paths;
    },
    RunResult() {
      return RunResult;
    },
    operationState(): OperationState {
      return this.busy ? OperationState.Busy : OperationState.Idle;
    },
  },

  created() {
    this.onSetMessage(this.showRepository);
    if (this.workload) {
      this.workloads = [this.workload];
    }
  },

  mounted() {
    if (this.executeOnMount) {
      this.fetchRuns();
    }
  },

  watch: {
    showRepository(value: boolean) {
      this.onSetMessage(value);
    },
  },

  methods: {
    humaniseDuration,
    formatDuration,
    onSetMessage(value: boolean) {
      if (!value) {
        this.headers = TABLE_HEADERS.filter((h) => h.key !== "repo");
      } else {
        this.headers = TABLE_HEADERS;
      }
    },

    onSetGroup(value: boolean) {
      if (value) {
        this.runs = this.groupByTicket(this.rawRuns);
      } else {
        this.runs = this.rawRuns;
      }
      this.summary = this.summarise(this.runs);
    },

    summarise(runs: RunRow[]): RunSummary {
      return {
        failed: runs.filter((c) => c.result === RunResult.Failed).length,
        succeeded: runs.filter((c) => c.result === RunResult.Succeeded).length,
        aborted: runs.filter((c) => c.result === RunResult.Aborted).length,
        total: runs.length,
      };
    },

    async fetchRuns(): Promise<void> {
      try {
        this.busy = true;
        this.progress = 0;
        this.rawRuns = [];
        this.runs = [];
        this.summary = null;

        await walkDateRangeBatched(
          new Date(this.startDateInput),
          new Date(this.endDateInput),
          API_BATCH_DAYS,
          async (batch: Date[], progress) => {
            const firstDate = batch[0];
            const endDate = batch[batch.length - 1];
            const runs = await fetchForDateRange(
              this.workloads,
              this.stageInput,
              this.jobGroupsInput,
              this.jobNamesInput,
              this.repoNamesInput,
              this.branch,
              firstDate,
              endDate,
            );

            // append and refresh UI
            this.rawRuns.push(...runs);
            this.onSetGroup(false);
            this.progress = progress * 100;
          },
        );
      } finally {
        this.busy = false;
      }
    },

    groupByTicket(runs: RunRow[]): RunRow[] {
      const groupedRows: RunRow[] = [];

      const groups: Record<string, RunRow> = {};
      for (const run of runs) {
        if (!run.id) {
          groupedRows.push(run);
          continue;
        }
        let group = groups[run.id];
        if (!group) {
          // deep clone
          group = {
            ...run,
          };
        } else {
          if (new Date(run.date).getTime() < new Date(group.date).getTime()) {
            group.date = run.date;
          }
          if (run.title && !group.title?.includes(run.title)) {
            group.title += " \n" + run.title;
          }
        }
        groups[run.id] = group;
      }
      groupedRows.push(...Object.values(groups));

      logger(`Grouped ${runs.length} runs into ${groupedRows.length} groups`);
      return groupedRows;
    },
  },
};
</script>

<style scoped>
.run-row-issue,
.run-summary span {
  white-space: nowrap;
}

.title__content,
.message__content {
  white-space: pre-line;
}
</style>
