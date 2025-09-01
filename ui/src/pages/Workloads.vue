<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">Workloads</h2>
          <p>Overview of all the workloads.</p>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>

  <v-container>
    <v-row>
      <v-col
        cols="12"
        sm="6"
        md="4"
        lg="3"
        v-for="workload in workloads"
        :key="workload.id"
        class="d-flex"
        style="flex-direction: column"
      >
        <v-card class="flex-grow-1 d-flex" style="flex-direction: column">
          <v-card-title
            ><v-icon class="mr-2" :color="workload.color">mdi-circle</v-icon>{{ workload.name }}</v-card-title
          >
          <v-card-text class="flex-grow-1">
            <v-list>
              <v-list-item v-for="(count, repo) in workload.repos" :key="repo" class="workload-repo py-0">
                <v-list-item-title>{{ repo }}</v-list-item-title>
                <v-list-item-subtitle>{{
                  count === 0 ? "No repositories" : count === 1 ? "1 repository" : `${count} repositories`
                }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-divider />
          <v-card-actions>
            <v-btn :to="`${Paths.Workloads}/${workload.id}`" color="primary" plain>View workload</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { type WorkloadDetail } from "@/model/config";
import { getWorkloadDetails } from "@/services/workload";
import { Paths } from "@/router/paths";

const workloads: WorkloadDetail[] = getWorkloadDetails();

const items = [
  {
    title: "Workloads",
    to: Paths.Workloads,
  },
];
</script>

<style scoped>
.workload-repo {
  font-size: smaller;
}
</style>
