<template>
  <v-card>
    <v-card-title>Pipeline health</v-card-title>
    <v-card-subtitle>Outcome of pipeline runs.</v-card-subtitle>

    <v-card-text v-if="!!alert">
      <AlertMessage :alert="alert" />
    </v-card-text>

    <v-container fluid>
      <v-row>
        <v-col>
          <v-card-text>
            <DynamicInputs
              @execute="onQuery"
              @input="(q) => (queryArgs = q)"
              :operationState="operationState"
              query-name="Pipeline outcomes"
              :query-types="queryTypes"
              :default-inputs="defaultInputs"
              :execute-on-mount="executeOnMount"
              :hide-inputs="hideInputs"
            />
          </v-card-text>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" sm="6" lg="4" xl="2" v-for="outcomes in workloadOutcomes" :key="outcomes.key">
          <v-card variant="flat">
            <v-card-title class="text-center">{{ outcomes.key }}</v-card-title>
            <v-card-item>
              <div class="text-h4 text-center">{{ Math.round(outcomes.success) }}%</div>
              <DoughnutChart :chart-data="outcomes.chartData" />
            </v-card-item>
            <v-card-actions class="mt-0">
              <v-btn v-if="outcomes.runsUrl" color="primary" :to="outcomes.runsUrl">Show runs</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script lang="ts">
// @ts-nocheck
import DynamicInputs from "@/components/DynamicInputs.vue";
import AlertMessage from "@/components/AlertMessage.vue";
import { executeQuery } from "@/services/query";
import { OperationState } from "@/utils/ui";
import { calculatePercentageByTag } from "@/chart/common";
import { logger } from "@/utils/logger";
import DoughnutChart from "@/components/charts/DoughnutChart.vue";
import { QueryName } from "@/queries/queries";
import { listJobGroups, listWorkloadIds } from "@/utils/config";
import { InputType } from "@/queries/inputs";
import { createDoughnutChartData } from "@/chart/doughnut";
import { Paths } from "@/router/paths";
import { buildPath } from "@/utils/path";

export default {
  name: "PipelineOutcome",
  computed: {
    Paths() {
      return Paths;
    },
    InputType() {
      return InputType;
    },
  },
  components: {
    DoughnutChart,
    DynamicInputs,
    AlertMessage,
  },
  props: {
    workload: {
      type: String,
      default: null,
    },
    stageId: {
      type: String,
      default: null,
    },
    branchName: {
      type: String,
      default: null,
    },
    executeOnMount: {
      type: Boolean,
      default: false,
    },
    hideInputs: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    async onQuery(rawQueries) {
      this.operationState = OperationState.Busy;
      this.alert = null;
      try {
        const args = rawQueries[0].args;
        this.workloadOutcomes = [];

        let workloads = [];
        if (args.workloads.length === 1 && args.workloads[0] === "all") {
          workloads = listWorkloadIds();
        } else {
          workloads = args.workloads;
        }

        let jobGroups = [];
        if (!args.jobGroups || args.jobGroups.length === 0) {
          jobGroups = listJobGroups();
        } else {
          jobGroups = args.jobGroups;
        }

        let stageId = args.stageId;

        // split into individual queries
        const queries = [];
        for (const workload of workloads) {
          for (const jobGroup of jobGroups) {
            const query = {
              queryName: QueryName.PipelineRuns,
              args: {
                ...args,
                jobGroups: [jobGroup],
                workloads: [workload],
              },
            };
            queries.push(this.runQuery(query, jobGroup, workload, stageId));
          }
        }

        await Promise.all(queries);
        this.operationState = OperationState.Idle;
      } catch (error) {
        console.error("Failed to run queries", error);
        this.alert = {
          type: "error",
          message: error.message,
        };
      } finally {
        this.operationState = OperationState.Idle;
      }
    },
    runQuery: async function (query, jobGroup, workload, stageId) {
      logger(`Executing pipeline runs query with args`, query.args);
      try {
        const result = await executeQuery(query);

        if (result.size > 0) {
          const percentages = calculatePercentageByTag(result, (tag) => {
            return tag.split("/")[1];
          });
          const chartData = createDoughnutChartData(percentages);

          let success = 0;
          for (let i = 0; i < chartData.labels.length; i++) {
            const label = chartData.labels[i];
            const axisName = label.split("/")[0];
            if (axisName.endsWith("-successful")) {
              success = chartData.data[i];
              break;
            }
          }

          const runsUrl = this.computeUrlToPipelineRuns(workload, stageId, jobGroup);
          this.workloadOutcomes.push({
            key: `${workload}-${jobGroup}`,
            success,
            chartData,
            runsUrl,
          });
        } else {
          logger(`No pipeline outcomes for:`, `${workload}-${jobGroup}`);
        }
      } catch (e) {
        throw new Error(`Failed to fetch pipeline runs for ${workload}/${jobGroup}: ${e}`);
      }
    },
    computeUrlToPipelineRuns(workloadId, stageId, jobGroup) {
      if (!this.queryArgs.workloads) {
        return null;
      }
      const params = {
        executeImmediately: true,
        workloadId: workloadId,
        stageId,
        branchName: this.branchName,
        jobGroup: jobGroup,
        startDate: this.queryArgs.startDate,
        endDate: this.queryArgs.endDate,
      };
      return buildPath(Paths.WorkloadPipelineRuns, params);
    },
  },
  data() {
    const workloads = this.workload ? [this.workload] : [];
    return {
      workloadOutcomes: [],
      operationState: OperationState.Idle,
      queryTypes: [QueryName.PipelineRuns],
      alert: null as Alert | null,
      defaultInputs: {
        workloads,
        stageId: this.stageId,
        branchNames: this.branchName ? [this.branchName] : [],
      },
      queryArgs: {},
    };
  },
};
</script>
