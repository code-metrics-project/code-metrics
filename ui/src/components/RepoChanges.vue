<template>
  <v-card>
    <v-card-title>Repository changes</v-card-title>
    <v-card-subtitle>List commits by workload and repository.</v-card-subtitle>
    <v-card-text>
      <v-row>
        <v-col cols="9">
          <v-row>
            <v-col cols="6">
              <workload-names :defaults="workloads" @input="(w) => (workloads = w)" :operationState="operationState" />
            </v-col>
            <v-col cols="6">
              <repo-groups :defaults="repoGroups" @input="(rg) => (repoGroups = rg)" :operationState="operationState" />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <DatePicker v-model="startDate" label="Start date" :operationState="operationState" />
            </v-col>
            <v-col cols="6">
              <DatePicker v-model="endDate" label="End date" :operationState="operationState" />
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="3">
          <v-card-subtitle>
            Display
            <v-checkbox v-model="groupTickets" label="Group tickets" :disabled="busy" class="my-2" />
            <v-checkbox v-model="showMessages" label="Show messages" :disabled="busy" class="my-0" />
          </v-card-subtitle>
        </v-col>
      </v-row>
      <v-btn :disabled="busy" @click="fetchChanges" color="primary" class="mr-2">
        {{ fetchLabel }}
      </v-btn>
      <v-progress-circular v-if="busy" :model-value="progress" color="primary" :width="4" :size="32" class="mr-3" />
    </v-card-text>

    <v-card-title>
      Changes
      <v-row>
        <v-spacer />
        <v-col>
          <v-text-field v-model="search" append-icon="mdi-magnify" label="Search" single-line hide-details />
        </v-col>
      </v-row>
    </v-card-title>

    <v-sheet color="accent" v-if="summary" class="mt-3">
      <v-row>
        <v-col cols="8">
          <v-card-item>
            <v-card-subtitle class="subtitle-1 font-weight-bold">Summary</v-card-subtitle>
          </v-card-item>
          <v-card-text class="change-summary">
            <span class="font-weight-medium">{{ summary.total }} changes</span>
            <span v-if="groupTickets">&nbsp;(grouped)</span>
            <span class="ml-3"><v-icon color="red" class="mr-1">mdi-bug</v-icon>Bugs: {{ summary.bugs }}</span>
            <span class="ml-3"><v-icon color="blue" class="mr-1">mdi-ticket</v-icon>Tasks: {{ summary.tasks }}</span>
            <span class="ml-3"
              ><v-icon color="orange" class="mr-1">mdi-help-rhombus</v-icon>No ticket:
              {{ summary.prs + summary.bareCommits }}</span
            >
          </v-card-text>
        </v-col>
        <v-col class="d-flex">
          <v-spacer />
          <v-card-item>
            <v-btn
              v-bind="props"
              variant="flat"
              density="default"
              @click="() => (showModalQuery = true)"
              :disabled="busy"
              aria-label="Show change categories"
            >
              <slot name="prepend"><v-icon icon="mdi-shape-outline" /></slot>
              <slot name="default">Show categories</slot>
            </v-btn>
          </v-card-item>
        </v-col>
      </v-row>
    </v-sheet>

    <v-data-table
      :headers="headers"
      :items="changes"
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
      <template v-slot:[`item.commits`]="{ item }">
        <span v-for="(commit, index) in item.commits" :key="commit.id">
          <span v-if="index > 0">,&#32;</span>
          <a :href="commit.link" target="_blank">{{ commit.id }}</a>
        </span>
      </template>
      <template v-slot:[`item.id`]="{ item }">
        <span class="change-row-issue">
          <v-icon v-if="item.type === 'PR'" color="green" class="mr-1">mdi-source-pull</v-icon>
          <v-icon v-else-if="item.type === 'Commit'" color="grey" class="mr-1">mdi-code-tags</v-icon>
          <v-icon v-else-if="item.type === 'Bug'" color="red" class="mr-1">mdi-bug</v-icon>
          <v-icon v-else color="blue" class="mr-1">mdi-ticket</v-icon>
          <a :href="item.link" target="_blank">{{ item.id }}</a>
        </span>
      </template>
      <template v-slot:[`item.date`]="{ item }">
        {{ new Date(item.date).toLocaleString() }}
      </template>
      <template v-slot:item[`title`]="{ item }">
        <span class="title__content">{{ item.raw.title }}</span>
      </template>
      <template v-slot:item[`message`]="{ item }">
        <span class="message__content">{{ item.raw.message }}</span>
      </template>
    </v-data-table>
  </v-card>

  <modal-query
    :query-name="QueryName.ChangeCategories"
    :chart-type="ChartType.DoughnutChart"
    v-model="showModalQuery"
    :inputs="{
      workloads: workloads,
      startDate: startDate,
      endDate: endDate,
    }"
  />
</template>

<script lang="ts">
// @ts-nocheck
import DatePicker from "@/components/DatePicker.vue";
import { getRelativeDate, walkDateRangeBatched } from "@/utils/date";
import WorkloadNames from "@/components/inputs/WorkloadNames.vue";
import RepoGroups from "@/components/inputs/RepoGroups.vue";
import { OperationState } from "@/utils/ui";
import { logger } from "@/utils/logger";
import { type ChangeRow, fetchForDateRange } from "@/services/changes";
import ModalQuery from "@/components/query/ModalQuery.vue";
import { QueryName } from "@/queries/queries";
import { ChartType } from "@/chart/chart-types";

const API_BATCH_DAYS = 7;

const TABLE_HEADERS = [
  {
    title: "Workload",
    align: "start",
    sortable: true,
    key: "workload",
  },
  {
    title: "Ticket",
    align: "start",
    sortable: false,
    key: "id",
  },
  {
    title: "Date",
    align: "start",
    sortable: true,
    key: "date",
  },
  {
    title: "Title",
    align: "start",
    sortable: false,
    key: "title",
  },
  {
    title: "Repository",
    align: "start",
    sortable: true,
    key: "repo",
  },
  {
    title: "Commits",
    align: "start",
    sortable: false,
    key: "commits",
  },
  {
    title: "Message",
    align: "start",
    sortable: false,
    key: "message",
  },
];

type RepoChangeSummary = {
  total: number;
  bugs: number;
  tasks: number;
  prs: number;
  bareCommits: number;
};

export default {
  components: { ModalQuery, RepoGroups, WorkloadNames, DatePicker },

  props: {
    workload: {
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
      rawChanges: [] as ChangeRow[],
      changes: [] as ChangeRow[],
      search: "",
      groupTickets: true,
      showMessages: false,
      fetchLabel: "Show changes",
      startDate: getRelativeDate(new Date(), -30),
      endDate: getRelativeDate(new Date(), 0),
      workloads: [] as string[],
      repoGroups: [] as string[],
      busy: false,
      progress: 0,
      summary: null as RepoChangeSummary | null,
      showModalQuery: false,
    };
  },

  computed: {
    QueryName() {
      return QueryName;
    },
    ChartType() {
      return ChartType;
    },
    operationState(): OperationState {
      return this.busy ? OperationState.Busy : OperationState.Idle;
    },
  },

  created() {
    this.onSetMessage(this.showMessages);
    if (this.workload) {
      this.workloads = [this.workload];
    }
  },

  mounted() {
    if (this.executeOnMount) {
      this.fetchChanges();
    }
  },

  watch: {
    showMessages(value: boolean) {
      this.onSetMessage(value);
    },

    groupTickets(value: boolean) {
      this.onSetGroup(value);
    },
  },

  methods: {
    onSetMessage(value: boolean) {
      if (!value) {
        this.headers = TABLE_HEADERS.filter((h) => h.key !== "message");
      } else {
        this.headers = TABLE_HEADERS;
      }
    },

    onSetGroup(value: boolean) {
      if (value) {
        this.changes = this.groupByTicket(this.rawChanges);
      } else {
        this.changes = this.rawChanges;
      }
      this.summary = this.summarise(this.changes);
    },

    summarise(changes: ChangeRow[]): RepoChangeSummary {
      return {
        bugs: changes.filter((c) => c.type === "Bug").length,
        tasks: changes.filter((c) => c.type !== "Bug" && c.type !== "PR").length,
        prs: changes.filter((c) => c.type === "PR").length,
        bareCommits: changes.filter((c) => c.type === "Commit").length,
        total: changes.length,
      };
    },

    async fetchChanges(): Promise<void> {
      try {
        this.busy = true;
        this.progress = 0;
        this.rawChanges = [];
        this.changes = [];
        this.summary = null;

        await walkDateRangeBatched(
          new Date(this.startDate),
          new Date(this.endDate),
          API_BATCH_DAYS,
          async (batch: Date[], progress) => {
            const firstDate = batch[0];
            const endDate = batch[batch.length - 1];
            const changes = await fetchForDateRange(this.workloads, this.repoGroups, firstDate, endDate);

            // append and refresh UI
            this.rawChanges.push(...changes);
            this.onSetGroup(this.groupTickets);
            this.progress = progress * 100;
          },
        );
      } finally {
        this.busy = false;
      }
    },

    groupByTicket(changes: ChangeRow[]): ChangeRow[] {
      const groupedRows: ChangeRow[] = [];

      const groups: Record<string, ChangeRow> = {};
      for (const change of changes) {
        if (!change.id) {
          groupedRows.push(change);
          continue;
        }
        let group = groups[change.id];
        if (!group) {
          // deep clone
          group = {
            ...change,
            commits: [...change.commits],
          };
        } else {
          group.commits.push(...change.commits);
          if (new Date(change.date).getTime() < new Date(group.date).getTime()) {
            group.date = change.date;
          }
          if (change.message) {
            group.message += " \n" + change.message;
          }
          if (change.title && !group.title?.includes(change.title)) {
            group.title += " \n" + change.title;
          }
        }
        groups[change.id] = group;
      }
      groupedRows.push(...Object.values(groups));

      logger(`Grouped ${changes.length} changes into ${groupedRows.length} groups`);
      return groupedRows;
    },
  },
};
</script>

<style scoped>
.change-row-issue,
.change-summary span {
  white-space: nowrap;
}

.title__content,
.message__content {
  white-space: pre-line;
}
</style>
