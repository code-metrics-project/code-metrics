<template>
  <v-card>
    <v-card-title>{{ title }}</v-card-title>
    <v-card-subtitle>{{ subtitle }}</v-card-subtitle>

    <v-card-text>
      <v-combobox v-model="inputPaths" :disabled="busy" label="Paths" @change="onChange" multiple chips />

      <v-btn :disabled="busy" v-model:pressed="busy" color="primary" @click="runBreakdown">
        {{ runToggleLabel }}
      </v-btn>

      <v-spacer />

      <v-card v-if="metricBreakdown.length">
        <v-card-title>{{ repo }}</v-card-title>
        <div v-for="(obj, index) in metricBreakdown" :key="index">
          <v-card-subtitle class="text-subtitle-1">Path: {{ obj.path }}<br /></v-card-subtitle>
          <v-card-text>
            <div v-for="metric in obj.metrics" :key="metric.title">
              <v-btn variant="text" icon :href="metric.analysisLink" target="_blank"
                ><v-icon small>mdi-open-in-new</v-icon></v-btn
              >
              {{ metric.title }}: {{ metric.value }}{{ metric.suffix }}
              <v-chip v-if="!!metric.badge" x-small :color="metric.badge.color">{{ metric.badge.content }}</v-chip>
            </div>
          </v-card-text>
        </div>
      </v-card>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
// @ts-nocheck
import axios from "@/utils/axios";
import { METRIC_BREAKDOWN } from "@/utils/urls";
import { logger } from "@/utils/logger";
import { getMetricSuffix, getMetricTitle, categoriseCoverage, MetricValueCategory } from "@/utils/metricDisplay";

type TMetricBreakdown = {
  path: string;
  metrics: {
    title: string;
    analysisLink: string;
    value: string;
    suffix: string;
    badge: {
      content: string;
      color: string;
    };
  }[];
};

type TData = {
  busy: boolean;
  metricBreakdown: TMetricBreakdown[];
  inputPaths: string[];
  runToggleLabel: string;
};

export default {
  props: {
    title: {
      type: String,
      default: () => "File metric breakdown",
    },
    subtitle: {
      type: String,
      default: () => "View metric values for paths within a repository.",
    },
    workload: {
      type: String,
    },
    repo: {
      type: String,
    },
    metrics: {
      type: Array as () => string[],
      default: () => ["coverage"],
    },
    paths: {
      type: Array as () => string[],
      default: () => [],
    },
  },

  data(): TData {
    return {
      busy: false,
      metricBreakdown: [],
      inputPaths: this.paths,
      runToggleLabel: "Run Breakdown",
    };
  },

  methods: {
    onChange() {
      this.inputPaths = this.inputPaths.map((ip) => ip.replace(/^\//, ""));
    },

    async runBreakdown(): Promise<void> {
      this.busy = true;
      this.runToggleLabel = "Running Breakdown...";
      try {
        const response = await axios.get(METRIC_BREAKDOWN, {
          params: {
            workload: this.workload,
            repo: this.repo,
            metrics: this.metrics.join(","),
            paths: this.inputPaths.join(","),
          },
        });

        const breakdown = response.data.map((m) => {
          const formattedMetrics = this.metrics.map((metricName) => {
            const entry = m[metricName as string];
            const metricValue = entry.value as number;
            return {
              title: getMetricTitle(metricName),
              value: metricValue,
              suffix: getMetricSuffix(metricName),
              badge: getBadge(metricName, metricValue),
              analysisLink: entry.analysisLink,
            };
          });
          return { path: m.path, metrics: formattedMetrics };
        });
        logger(`Metric breakdown`, breakdown);
        this.metricBreakdown = breakdown;
        this.runToggleLabel = "Run Breakdown";
      } catch (error) {
        this.runToggleLabel = "Error";
      }
      this.busy = false;
    },
  },
};

function getBadge(metricName: string, metricValue: number) {
  if (metricName !== "coverage") {
    return null;
  }
  switch (categoriseCoverage(metricValue)) {
    case MetricValueCategory.Good:
      return {
        content: "ok",
        color: "green",
      };
    case MetricValueCategory.Warning:
      return {
        content: "warning",
        color: "yellow",
      };
    case MetricValueCategory.Danger:
      return {
        content: "danger",
        color: "red",
      };
    default:
      return {};
  }
}
</script>
