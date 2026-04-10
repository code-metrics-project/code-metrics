<template>
  <DynamicQuery
    title="Code quality metric history"
    subtitle="Retrieve historical metric data for workloads and repositories."
    :query-types="[QueryName.CodeCoverage]"
    @input="onInput"
  >
    <template v-slot:buttons>
      <v-btn @click="getHistoryAsCsv" color="secondary" class="ml-2"> Download as CSV </v-btn>
    </template>
  </DynamicQuery>
</template>

<script lang="ts">
import DynamicQuery from "@/components/DynamicQuery.vue";
import { addAuthQueryParam } from "@/utils/apiClient";
import { CODE_ANALYSIS_METRIC_HISTORY_CSV, getApiBaseUrl } from "@/utils/urls";
import { logger } from "@/utils/logger";
import { QueryName } from "@/queries/queries";

type Inputs = {
  workloads: string[];
  repoGroups: string[];
  startDate: string;
};

export default {
  name: "CodeAnalysisMetricHistory",
  computed: {
    QueryName() {
      return QueryName;
    },
  },
  components: {
    DynamicQuery,
  },
  methods: {
    onInput(inputs: Inputs) {
      this.inputs = inputs;
    },

    async getHistoryAsCsv(): Promise<void> {
      const baseUrl =
        getApiBaseUrl() +
        `${CODE_ANALYSIS_METRIC_HISTORY_CSV}` +
        `?workloads=${this.inputs.workloads.join(",")}` +
        `&repoGroups=${this.inputs.repoGroups.join(",")}` +
        `&startDate=${this.inputs.startDate}`;

      const metricsCsvUrl = await addAuthQueryParam(baseUrl);
      logger(`Redirecting to metrics CSV: ${metricsCsvUrl}`);
      document.location.href = metricsCsvUrl;
    },
  },
  data() {
    return {
      inputs: {} as Inputs,
    };
  },
};
</script>
