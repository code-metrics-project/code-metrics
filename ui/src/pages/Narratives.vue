<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">{{ $t("nav.changes") }}</h2>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <RepoChanges
            v-if="!Array.isArray(workloadId)"
            :workload="workloadId as string"
            :executeOnMount="executeImmediately"
          />
          <p v-else>
            Multiple workloads provided in query, please provide just one.
          </p>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import RepoChanges from "@/components/RepoChanges.vue";
import { Paths } from "@/router/paths";

const { t } = useI18n();
const route = useRoute();

const { workloadId, executeImmediately: queryExecuteImmediately } =
  route.query as { workloadId: string; executeImmediately: string };
const executeImmediately = queryExecuteImmediately === "true";

const items = workloadId
  ? [
      {
        title: "Workloads",
        to: Paths.Workloads,
      },
      {
        title: workloadId,
        to: `${Paths.Workloads}/${workloadId}`,
      },
      {
        title: t("nav.changes"),
        to: `${Paths.Workloads}/${workloadId}`,
      },
    ]
  : [
      {
        title: t("nav.program"),
        to: Paths.Program,
      },
      {
        title: t("nav.changes"),
        to: Paths.ProgramMetrics,
      },
    ];
</script>
