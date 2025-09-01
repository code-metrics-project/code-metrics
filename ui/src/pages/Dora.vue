<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col>
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">{{ workload.name }}</h2>
          <p>DORA metrics for this team.</p>
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
</template>

<script lang="ts" setup>
// @ts-nocheck
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Paths } from "@/router/paths";
import { getWorkloadDetail } from "@/services/workload";
import Dashboard from "@/components/dashboard/Dashboard.vue";
import { getRelativeDate } from "@/utils/date";
import type { TDashboard } from "@/queries/dashboards";
import { formatSecondsAsDaysAndHours, formatSecondsAsHoursAndMinutes, formatValueAsPercentage } from "@/chart/common";

const DAYS_BACK = 15;
const SHORT_DAYS_BACK = 7;

const route = useRoute();

const workloadId = computed((): string => {
  const { workloadId } = route.query;
  return workloadId;
});

const workload = computed(() => {
  return getWorkloadDetail(workloadId.value);
});

const dashboard = computed(() => {
  const workloadIdValue = workloadId.value;
  const workloadValue = workload.value;

  const dash: TDashboard = {
    id: `${workloadIdValue}-summary`,
    name: workloadValue.name,
    data: [
      {
        presentationOptions: {
          title: `Deployment frequency last ${DAYS_BACK} days`,
          width: 6,
        },
        id: "deployment-frequency",
        dataSource: {
          name: "deploymentFrequency",
          args: {
            startDate: getRelativeDate(new Date(), -DAYS_BACK),
            workloads: [workloadIdValue],
          },
        },
        dataView: {
          name: "ColChart",
          props: {},
        },
      },
      {
        id: "change-failure-rate",
        dataSource: {
          name: "changeFailureRate",
          args: {
            incidentFilter: { priority: "Low" },
            startDate: getRelativeDate(new Date(), -DAYS_BACK),
            workloads: [workloadIdValue],
          },
        },
        dataView: {
          name: "ColChart",
          props: {
            colors: ["#ffc609"],
            dataLabels: {
              enabled: false,
            },
            yaxis: {
              max: 1,
            },
          },
        },
        presentationOptions: {
          title: `Change failure rate last ${DAYS_BACK} days`,
          width: 6,
        },
      },
      {
        id: "lead-time-for-changes",
        dataSource: {
          name: "leadTimeForChanges",
          args: {
            startDate: getRelativeDate(new Date(), -SHORT_DAYS_BACK),
            workloads: [workloadIdValue],
          },
        },
        dataView: {
          name: "Chart",
          props: {
            dataLabels: {
              enabled: false,
            },
          },
        },
        presentationOptions: {
          title: `Lead time for changes last ${SHORT_DAYS_BACK} days`,
          width: 6,
        },
      },
      {
        id: "time-to-restore-service",
        dataSource: {
          name: "timeToRestoreService",
          args: {
            incidentFilter: { priority: "Low" },
            startDate: getRelativeDate(new Date(), -DAYS_BACK),
            workloads: [workloadIdValue],
          },
        },
        dataView: {
          name: "ColChart",
          props: {
            dataLabels: {
              enabled: false,
            },
          },
        },
        presentationOptions: {
          title: `Time to restore service last ${DAYS_BACK} days`,
          width: 6,
        },
      },
    ],
  };
  return dash;
});

const items = computed(() => [
  {
    title: "Workloads",
    to: Paths.Workloads,
  },
  {
    title: workloadId.value,
    to: `${Paths.Workloads}/${workloadId.value}`,
  },
  {
    title: "DORA",
    to: `${Paths.Workloads}/dora?workloadId=${workloadId.value}`,
  },
]);
</script>
