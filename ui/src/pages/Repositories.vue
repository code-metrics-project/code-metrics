<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="breadcrumbItems"></v-breadcrumbs>
            <h2 class="text-h2">{{ pageTitle }}</h2>
            <p>{{ pageDescription }}</p>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <v-card>
            <v-card-title>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="search"
                    prepend-inner-icon="mdi-magnify"
                    label="Search repositories"
                    single-line
                    hide-details
                    clearable
                    density="compact"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-card-title>
            <v-data-table
              id="repositories-table"
              :headers="headers"
              :items="repositories"
              :search="search"
              :items-per-page="25"
              :items-per-page-options="[10, 25, 50, 100, -1]"
              class="elevation-1"
            >
              <template v-slot:item.name="{ item }">
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                  {{ item.name }}
                  <v-icon size="small" class="ml-1">mdi-open-in-new</v-icon>
                </a>
              </template>

              <template v-slot:item.repoGroups="{ item }">
                <v-chip
                  v-for="group in item.repoGroups"
                  :key="group"
                  size="small"
                  class="ma-1"
                  color="primary"
                  variant="outlined"
                >
                  {{ group }}
                </v-chip>
              </template>

              <template v-slot:item.actions="{ item }">
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  :to="{
                    name: 'PipelineHealth',
                    query: {
                      workloadId: item.workloadId,
                      executeImmediately: 'true',
                      branchName: 'main',
                      repoName: item.name,
                    },
                  }"
                  class="mr-1"
                >
                  <v-icon size="small" class="mr-1">mdi-pulse</v-icon>
                  Pipeline Health
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  :to="{
                    name: 'PipelineRuns',
                    query: {
                      workloadId: item.workloadId,
                      executeImmediately: 'true',
                      branchName: 'main',
                      repoName: item.name,
                    },
                  }"
                >
                  <v-icon size="small" class="mr-1">mdi-run</v-icon>
                  Pipeline Runs
                </v-btn>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { getRepositoryDetails, getWorkloadDetail } from "@/services/workload";
import { Paths } from "@/router/paths";

const route = useRoute();
const search = ref("");

const workloadId = computed(() => {
  const id = route.query.workloadId;
  return Array.isArray(id) ? id[0] : id;
});

const repositories = computed(() => {
  return getRepositoryDetails(workloadId.value || undefined);
});

const pageTitle = computed(() => {
  if (workloadId.value) {
    const workload = getWorkloadDetail(workloadId.value);
    return `Repositories - ${workload.name}`;
  }
  return "All Repositories";
});

const pageDescription = computed(() => {
  if (workloadId.value) {
    return `Repositories in the ${getWorkloadDetail(workloadId.value).name} workload.`;
  }
  return "All repositories across all workloads.";
});

const breadcrumbItems = computed(() => {
  if (workloadId.value) {
    const workload = getWorkloadDetail(workloadId.value);
    return [
      {
        title: "Workloads",
        to: Paths.Workloads,
      },
      {
        title: workload.name,
        to: `${Paths.Workloads}/${workloadId.value}`,
      },
      {
        title: "Repositories",
        to: `${Paths.WorkloadRepositories}?workloadId=${workloadId.value}`,
      },
    ];
  }
  return [
    {
      title: "Program",
      to: Paths.Program,
    },
    {
      title: "Repositories",
      to: Paths.Repositories,
    },
  ];
});

const headers = computed(() => {
  const baseHeaders = [
    { title: "Repository", key: "name", sortable: true },
    { title: "Repo Groups", key: "repoGroups", sortable: false },
    { title: "Actions", key: "actions", sortable: false, width: "350px" },
  ];

  // Only show workload column when not filtering by workload
  if (!workloadId.value) {
    baseHeaders.splice(1, 0, { title: "Workload", key: "workloadName", sortable: true });
  }

  return baseHeaders;
});
</script>
