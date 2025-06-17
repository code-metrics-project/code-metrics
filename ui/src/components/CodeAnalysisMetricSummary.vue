<template>
  <v-card class="mb-2">
    <v-sheet
      color="grey-lighten-4"
      class="pt-3"
      v-for="summary in summaries"
      :key="summary.title"
    >
      <v-card-subtitle class="subtitle-1 font-weight-bold">{{
        summary.title
      }}</v-card-subtitle>
      <v-card-text class="metric-summary">
        <span class="ml-3" v-for="item in summary.items" :key="item.title"
          ><v-icon :color="item.colour" class="mr-1">{{ item.icon }}</v-icon
          >{{ item.title }}: {{ item.value }}</span
        >
      </v-card-text>
    </v-sheet>
  </v-card>
</template>

<script lang="ts">
import { type QueryAndResult } from "@/model/query";
import { type ResultsSummary, summariseMetrics } from "@/queries/config";

export default {
  props: {
    summarise: {
      type: Array,
      default: () => [],
    },
    metrics: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      summaries: [] as ResultsSummary[],
    };
  },

  mounted() {
    if (!this.summarise) {
      return;
    }
    const filtered = (this.metrics as unknown as QueryAndResult[]).filter(
      (qr) => this.summarise.includes(qr.queryName),
    );
    for (const qr of filtered) {
      const summary = summariseMetrics(qr);
      if (summary) {
        this.summaries.push(summary);
      }
    }
  },
};
</script>

<style scoped>
.metric-summary span {
  white-space: nowrap;
}
</style>
