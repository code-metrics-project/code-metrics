<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col class="pb-8">
            <v-breadcrumbs :items="items"></v-breadcrumbs>
            <h2 class="text-h2">CI/CD pipeline</h2>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <PipelineRuns
            v-if="!Array.isArray(workloadId)"
            :workload="workloadId as string"
            :stage-id="stageId as string"
            :branch-name="branchName as string"
            :job-groups="jobGroups"
            :job-names="jobNames"
            :repo-names="repoNames"
            :start-date="startDate as string"
            :end-date="endDate as string"
            :executeOnMount="executeImmediately"
          />
          <p v-else>Multiple workloads provided in query, please provide just one.</p>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import PipelineRuns from "@/components/pipeline/RunList.vue";
import { Paths } from "@/router/paths";

const { t } = useI18n();
const route = useRoute();

const {
  workloadId,
  executeImmediately: queryExecuteImmediately,
  stageId,
  branchName,
  jobGroup,
  repoName: queryRepoName,
  jobName: queryJobName,
  startDate,
  endDate,
} = route.query;
const executeImmediately = queryExecuteImmediately === "true";

const jobGroups = jobGroup ? [jobGroup] : [];
const jobNames = queryJobName ? [queryJobName] : [];
const repoNames = queryRepoName ? [queryRepoName] : [];

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
        title: "CI/CI pipeline",
        to: `${Paths.Workloads}/${workloadId}`,
      },
    ]
  : [
      {
        title: t("nav.program"),
        to: Paths.Program,
      },
      {
        title: "CI/CI pipeline",
        to: Paths.ProgramMetrics,
      },
    ];
</script>
