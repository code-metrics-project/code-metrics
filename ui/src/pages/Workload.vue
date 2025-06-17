<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col>
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">{{ workload.name }}</h2>
            <p>Details about this workload.</p>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-btn
              :to="{
                name: 'Workload Changes',
                query: { workloadId, executeImmediately: true },
              }"
              class="mb-2 mr-2"
              >Recent changes</v-btn
            >
            <v-btn
              :to="{
                name: 'Code Quality',
                query: {
                  workloadId,
                  executeImmediately: true,
                },
              }"
              class="mb-2 mr-2"
              >Code Quality</v-btn
            >
            <v-btn
              :to="{
                name: 'PipelineRuns',
                query: {
                  workloadId,
                  executeImmediately: true,
                  branchName: 'main',
                },
              }"
              class="mb-2 mr-2"
              >CI/CD pipeline</v-btn
            >
            <v-btn
              :to="{
                name: 'PipelineHealth',
                query: {
                  workloadId,
                  executeImmediately: true,
                  branchName: 'main',
                },
              }"
              class="mb-2 mr-2"
              >Pipeline health</v-btn
            >
            <v-btn
              :to="{
                name: 'Tickets',
                query: { workloadId, executeImmediately: true },
              }"
              class="mb-2 mr-2"
              >Bugs and incidents</v-btn
            >
            <BehindFlag feature="dora">
              <v-btn
                :to="{
                  name: 'DORA',
                  query: { workloadId },
                }"
                class="mb-2 mr-2"
                >DORA Metrics</v-btn
              >
            </BehindFlag>
            <v-btn
              :to="{
                name: 'Analysis',
                query: { workloadId, executeImmediately: false },
              }"
              class="mb-2 mr-2"
              >Analyse</v-btn
            >
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <Dashboard :dashboard="dashboard" :key="dashboard.id" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { computed } from "vue";
import { useRoute } from "vue-router";
import { getWorkloadDetail } from "@/services/workload";
import Dashboard from "@/components/dashboard/Dashboard.vue";
import { getRelativeDate } from "@/utils/date";
import { ValueFormat } from "@/queries/inputs";
import type { TDashboard } from "@/queries/dashboards";
import BehindFlag from "@/components/BehindFlag.vue";
import { Paths } from "@/router/paths";

const DAYS_BACK = 60;
const SHORT_DAYS_BACK = 15;

const route = useRoute();

const workloadId = computed((): string => {
  return route.params.workloadId as string;
});

const workload = computed(() => {
  return getWorkloadDetail(workloadId.value);
});

const items = [
  {
    title: "Workloads",
    to: Paths.Workloads,
  },
  {
    title: workload.value.name,
    to: `${Paths.Workloads}/${workload.value.name}`,
  },
];

const dashboard = computed(() => {
  const workloadIdValue = workloadId.value;
  const workloadValue = workload.value;

  const dash: TDashboard = {
    id: `${workloadIdValue}-summary`,
    name: workloadValue.name,
    data: [
      {
        presentationOptions: {
          title: `Open bugs trend last ${DAYS_BACK} days`,
          width: 4,
        },
        id: "bugs-trend",
        dataSource: {
          name: "openBugs",
          args: {
            issueFilter: { priority: "Low" },
            startDate: getRelativeDate(new Date(), -DAYS_BACK),
            workloads: [workloadIdValue],
          },
        },
        dataView: {
          name: "Trend",
          props: {},
        },
      },
      {
        id: "coverage-trend",
        dataSource: {
          name: "codeCoverage",
          args: {
            startDate: getRelativeDate(new Date(), -DAYS_BACK),
            workloads: [workloadIdValue],
          },
        },
        dataView: {
          name: "Trend",
          props: {},
        },
        presentationOptions: {
          title: `Coverage trend last ${DAYS_BACK} days`,
          width: 4,
        },
      },
      {
        id: "pipeline-trend",
        dataSource: {
          name: "pipelineRuns",
          args: {
            startDate: getRelativeDate(new Date(), -SHORT_DAYS_BACK),
            workloads: [workloadIdValue],
            branchNames: ["main"],
            valueFormat: ValueFormat.PERCENTAGE,
          },
        },
        dataView: {
          name: "Trend",
          props: {},
        },
        presentationOptions: {
          title: `Pipeline success last ${SHORT_DAYS_BACK} days`,
          width: 4,
        },
      },
      {
        id: "bugs-chart",
        dataSource: {
          name: "newBugs",
          args: {
            issueFilter: { priority: "Low" },
            startDate: getRelativeDate(new Date(), -DAYS_BACK),
            workloads: [workloadIdValue],
          },
        },
        dataView: {
          name: "ColChart",
          props: {},
        },
        presentationOptions: {
          title: `New bugs last ${DAYS_BACK} days`,
          width: 6,
        },
      },
      {
        id: "coverage-chart",
        dataSource: {
          name: "codeCoverage",
          args: {
            startDate: getRelativeDate(new Date(), -DAYS_BACK),
            workloads: [workloadIdValue],
          },
        },
        dataView: {
          name: "Chart",
          props: {},
        },
        presentationOptions: {
          title: `Coverage last ${DAYS_BACK} days`,
          width: 6,
        },
      },
    ],
  };
  return dash;
});
</script>
