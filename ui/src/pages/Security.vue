<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">{{ $t("nav.security") }}</h2>
            <p>Security posture and vulnerability reports.</p>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <SecurityVulnerabilities
            :workload="singularWorkloadId"
            :branchNames="branchNames"
            :executeOnMount="executeImmediately"
          />
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <UploadFile />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import SecurityVulnerabilities from "@/components/SecurityVulnerabilities.vue";
import UploadFile from "@/components/UploadFile.vue";
import { Paths } from "@/router/paths";

const { t } = useI18n();
const route = useRoute();

const {
  workloadId,
  executeImmediately: executeImmediatelyRaw,
  branchNames,
} = route.query;
const executeImmediately = executeImmediatelyRaw === "true";
const singularWorkloadId =
  (Array.isArray(workloadId) ? workloadId[0] : workloadId) ?? undefined;

const items = [
  {
    title: t("nav.program"),
    to: Paths.Program,
  },
  {
    title: t("nav.security"),
    to: Paths.ProgramSecurity,
  },
];
</script>
