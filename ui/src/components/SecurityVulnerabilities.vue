<template>
  <v-card>
    <v-card-title>Vulnerability report</v-card-title>
    <v-card-subtitle>Security vulnerability information.</v-card-subtitle>

    <v-card-text v-if="!!alert">
      <v-alert :type="alert.type">{{ alert.message }}</v-alert>
    </v-card-text>

    <v-container fluid>
      <v-row>
        <v-col sm="6">
          <v-card-text>
            <DynamicInputs
              @execute="onQuery"
              :operationState="operationState"
              query-name="Security vulnerabilities"
              :query-types="queryTypes"
              :default-inputs="defaultInputs"
              :execute-on-mount="executeOnMount"
            />
          </v-card-text>
        </v-col>
      </v-row>
      <v-row>
        <v-col
          cols="12"
          sm="6"
          lg="4"
          xl="2"
          v-for="outcomes in workloadOutcomes"
          :key="outcomes.key"
        >
          <div class="text-h5 text-center">{{ outcomes.key }}</div>
          <div class="text-h4 text-center">
            {{ Math.round(outcomes.total) }} total
          </div>
          <DoughnutChart :chart-data="outcomes.chartData" />
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script lang="ts">
// @ts-nocheck
import DynamicInputs from "@/components/DynamicInputs.vue";
import { executeQuery } from "@/services/query";
import { OperationState } from "@/utils/ui";
import { calculatePercentageByTag } from "@/chart/common";
import { logger } from "@/utils/logger";
import DoughnutChart from "@/components/charts/DoughnutChart.vue";
import { QueryName } from "@/queries/queries";
import { listRepoGroups, listWorkloadIds } from "@/utils/config";
import { sumAllMetricValues } from "@/utils/metrics";
import { createDoughnutChartData } from "@/chart/doughnut";

export default {
  name: "SecurityVulnerabilities",
  components: {
    DoughnutChart,
    DynamicInputs,
  },
  props: {
    workload: {
      type: String,
      default: null,
    },
    executeOnMount: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    async onQuery(rawQueries) {
      this.operationState = OperationState.Busy;
      try {
        const args = rawQueries[0].args;
        this.workloadOutcomes = [];

        let workloads = [];
        if (args.workloads.length === 1 && args.workloads[0] === "all") {
          workloads = listWorkloadIds();
        } else {
          workloads = args.workloads;
        }

        let repoGroups = [];
        if (!args.repoGroups || args.repoGroups.length === 0) {
          repoGroups = listRepoGroups();
        } else {
          repoGroups = args.repoGroups;
        }

        // split into individual queries
        const queries = [];
        for (const workload of workloads) {
          for (const repoGroup of repoGroups) {
            const query = {
              queryName: QueryName.Vulnerabilities,
              args: {
                ...args,
                repoGroups: [repoGroup],
                workloads: [workload],
              },
            };
            queries.push(this.runQuery(query, repoGroup, workload));
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
    runQuery: async function (query, repoGroup, workload) {
      logger(`Executing security vulnerabilities query with args`, query.args);
      try {
        const result = await executeQuery(query);

        if (result.size > 0) {
          const percentages = calculatePercentageByTag(result, (tag) => {
            return tag.split("/")[1];
          });
          const chartData = createDoughnutChartData(percentages);

          const total = sumAllMetricValues(result);

          this.workloadOutcomes.push({
            key: `${workload}-${repoGroup}`,
            total,
            chartData,
          });
        } else {
          logger(
            `No security vulnerabilities for:`,
            `${workload}-${repoGroup}`,
          );
        }
      } catch (e) {
        throw new Error(
          `Failed to fetch security vulnerabilities for ${workload}/${repoGroup}: ${e}`,
        );
      }
    },
  },
  data() {
    const workloads = this.workload ? [this.workload] : [];
    return {
      workloadOutcomes: [],
      operationState: OperationState.Idle,
      queryTypes: [QueryName.Vulnerabilities],
      alert: null,
      defaultInputs: {
        workloads,
      },
    };
  },
};
</script>
