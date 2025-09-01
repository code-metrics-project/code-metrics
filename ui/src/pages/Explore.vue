<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">Explore</h2>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>

  <v-container fill-height class="d-flex align-center justify-center">
    <v-row>
      <v-col cols="12" sm="6" lg="3">
        <v-card title="Create Query" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-cog"></v-icon>
          </template>
          <v-card-text
            >Interrogate all the data in CodeMetrics, with the option to save frequently used queries.</v-card-text
          >
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.NewQuery">Create a new query</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card title="Saved Queries" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-view-agenda"></v-icon>
          </template>
          <v-card-text>View previously saved queries.</v-card-text>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.SavedQueries">View saved queries</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card title="Create Dashboard" class="d-flex flex-column fill-height" disabled>
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-view-dashboard-edit"></v-icon>
          </template>
          <v-card-text> Coming soon... </v-card-text>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.ProgramSecurity">Create a new dashboard</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="3">
        <v-card title="Saved Dashboards" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-view-dashboard"></v-icon>
          </template>
          <v-card-text>View previously saved or pre-configured dashboards.</v-card-text>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.SavedDashboards">View a saved dashboard</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import { Paths } from "@/router/paths";

const { t } = useI18n();

const items = [
  {
    title: "Explore",
    to: Paths.Explore,
  },
];
</script>
