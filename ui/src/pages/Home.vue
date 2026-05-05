<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="py-8">
          <h2 class="text-h2 pb-4">
            CodeMetrics <span class="home-classic-pill text-h5 font-italic">Classic UI</span>
          </h2>
          <p class="text-body-1 py-1">
            CodeMetrics is a system to help you gain deep insights into the quality of your software products. It draws
            on metrics about your source code, your CI/CD pipeline and your tickets (such as bugs/defects).
          </p>
          <p class="text-body-1 py-1">
            At its core, CodeMetrics provides a collection of whole project lifecycle code quality analysis tools.
          </p>
          <p class="text-body-1 py-1">Choose an option below to get started!</p>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>

  <v-container fill-height class="d-flex align-center justify-center">
    <v-row>
      <v-col cols="12" sm="4">
        <v-card :title="$t('nav.program')" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-account-group"></v-icon>
          </template>
          <v-card-item>I'm interested in programme level data.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.Program">View programme data</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card :title="$t('nav.workload')" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-account"></v-icon>
          </template>
          <v-card-item>I'm interested in my workload.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.Workloads">View workload data</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="4">
        <v-card :title="$t('nav.explore')" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-wrench"></v-icon>
          </template>
          <v-card-item>I want to explore the data.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.Explore">Explore data</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { Paths } from "@/router/paths";
</script>

<style scoped>
.home-classic-pill {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 12px;
  border: 1px solid currentColor;
  border-radius: 999px;
  line-height: 1.2;
}
</style>
