<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">Pipeline health</h2>
            <p>Outcomes and durations of CI/CD pipelines.</p>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <PipelineOutcomes
            :workload="workloadId"
            :branch-name="branchName"
            :stage-id="stageId"
            :hide-inputs="hideInputs"
            :executeOnMount="executeImmediately"
          />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { useRoute } from "vue-router";
import { Paths } from "@/router/paths";
import PipelineOutcomes from "@/components/pipeline/PipelineOutcomes.vue";
import { useI18n } from "vue-i18n";
import { InputType } from "@/queries/inputs";
import { getFirstPipelineStage } from "@/queries/config";

const { t } = useI18n();
const route = useRoute();

const { workloadId, executeImmediately: executeImmediatelyRaw, stageId: stageIdRaw, branchName } = route.query;

const executeImmediately = executeImmediatelyRaw === "true";
const stageId = stageIdRaw?.length ? stageIdRaw : getFirstPipelineStage();

// TODO change this to: workloadId ? [InputType.TAGS] : []; once iteration doesn't depend on workloadId
const hideInputs = [InputType.TAGS];

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
        title: "Pipelines",
        to: `${Paths.Workloads}/pipeline?workloadId=${workloadId}`,
      },
    ]
  : [
      {
        title: t("nav.program"),
        to: Paths.Program,
      },
      {
        title: "Pipelines",
        to: Paths.Pipelines,
      },
    ];
</script>
