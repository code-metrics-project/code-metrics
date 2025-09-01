<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">{{ $t("nav.program") }}</h2>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>

  <v-container fill-height class="d-flex align-center justify-center">
    <v-row>
      <v-col cols="12" sm="6" lg="4">
        <v-card :title="$t('nav.metrics')" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-chart-bar"></v-icon>
          </template>
          <v-card-item>Statistics and metrics about the programme.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.ProgramMetrics">{{ t("nav.programMetrics") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="4">
        <v-card :title="$t('nav.changes')" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-format-list-bulleted-type"></v-icon>
          </template>
          <v-card-item>Changes across the programme.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.ProgramNarratives">{{ t("nav.programChanges") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="4">
        <v-card :title="$t('nav.pipelines')" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-pipe"></v-icon>
          </template>
          <v-card-item>Programme pipeline health.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn
              color="primary"
              plain
              :to="{
                name: 'Programme Pipeline',
                query: {
                  executeImmediately: 'true',
                  branchName: 'main',
                },
              }"
              >{{ t("nav.programPipelines") }}</v-btn
            >
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="4">
        <v-card :title="$t('nav.qualityGates')" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-gate"></v-icon>
          </template>
          <v-card-item>Programme quality gate implementations.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.ProgramQualityGates">{{ t("nav.programQualityGates") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" lg="4">
        <v-card :title="$t('nav.security')" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-security"></v-icon>
          </template>
          <v-card-item>Programme security reports.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.ProgramSecurity">{{ t("nav.programSecurity") }}</v-btn>
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
    title: t("nav.program"),
    to: Paths.Program,
  },
];
</script>
