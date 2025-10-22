<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">Dependency Alerts</h2>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <DependencyAlertsList
            :workload-ids="workloadIds"
            :repo-name="repoNameString"
            :repo-groups="repoGroupsArray"
            :execute-on-mount="executeImmediately"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import DependencyAlertsList from "@/components/dependencyAlerts/DependencyAlertsList.vue";
import { Paths } from "@/router/paths";
import { computed } from "vue";

const { t } = useI18n();
const route = useRoute();

const { workloadId, executeImmediately: queryExecuteImmediately, repoName, repoGroups: queryRepoGroups } = route.query;

const executeImmediately = queryExecuteImmediately === "true";

const workloadIds = computed(() => {
  if (!workloadId) return [];
  return Array.isArray(workloadId)
    ? workloadId.filter((id): id is string => typeof id === "string")
    : [workloadId as string];
});

const repoGroupsArray = computed(() => {
  if (!queryRepoGroups) return [];
  return Array.isArray(queryRepoGroups)
    ? queryRepoGroups.filter((rg): rg is string => typeof rg === "string")
    : [queryRepoGroups as string];
});

const repoNameString = computed(() => {
  if (!repoName) return undefined;
  return typeof repoName === "string" ? repoName : undefined;
});

const items = workloadId
  ? [
      {
        title: "Workloads",
        to: Paths.Workloads,
      },
      {
        title: workloadId as string,
        to: `${Paths.Workloads}/${workloadId}`,
      },
      {
        title: "Dependency Alerts",
        to: Paths.WorkloadDependencyAlerts,
      },
    ]
  : [
      {
        title: t("nav.program"),
        to: Paths.Program,
      },
      {
        title: "Dependency Alerts",
        to: Paths.ProgramDependencyAlerts,
      },
    ];
</script>
