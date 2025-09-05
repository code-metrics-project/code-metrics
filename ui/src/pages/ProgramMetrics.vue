<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">Metrics</h2>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <code-analysis-aggregate />
        </v-col>
      </v-row>

      <v-row>
        <v-col>
          <code-analysis-metric-history />
        </v-col>
      </v-row>

      <v-row>
        <v-col>
          <dynamic-query
            title="Repository churn"
            subtitle="Retrieve historical data for repository churn."
            :query-types="[QueryName.RepoChurn]"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import CodeAnalysisAggregate from "@/components/CodeAnalysisAggregate.vue";
import DynamicQuery from "@/components/DynamicQuery.vue";
import CodeAnalysisMetricHistory from "@/components/CodeAnalysisMetricHistory.vue";
import { QueryName } from "@/queries/queries";
import { Paths } from "@/router/paths";

const { t } = useI18n();

const items = [
  {
    title: t("nav.program"),
    to: Paths.Program,
  },
  {
    title: "Metrics",
    to: Paths.ProgramMetrics,
  },
];
</script>
