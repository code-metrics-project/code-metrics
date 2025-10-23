<template>
  <v-expansion-panels v-if="packageSummaries.length > 0" class="mt-2">
    <v-expansion-panel>
      <v-expansion-panel-title>
        <span class="text-h6">{{ title }}</span>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-data-table
          :headers="headers"
          :items="packageSummaries"
          :sort-by="[{ key: 'violations', order: 'desc' }]"
          class="elevation-1"
          density="comfortable"
        >
          <template v-slot:[`item.package`]="{ item }">
            <span class="font-weight-medium">{{ item.package }}</span>
          </template>
          <template v-slot:[`item.severity`]="{ item }">
            <div class="d-flex gap-2">
              <v-chip v-if="item.criticalCount > 0" size="x-small" :color="getSeverityColor('critical')">
                {{ item.criticalCount }}
              </v-chip>
              <v-chip v-if="item.highCount > 0" size="x-small" :color="getSeverityColor('high')">
                {{ item.highCount }}
              </v-chip>
              <v-chip v-if="item.mediumCount > 0" size="x-small" :color="getSeverityColor('medium')">
                {{ item.mediumCount }}
              </v-chip>
              <v-chip v-if="item.lowCount > 0" size="x-small" :color="getSeverityColor('low')">
                {{ item.lowCount }}
              </v-chip>
            </div>
          </template>
          <template v-slot:[`item.violations`]="{ item }">
            <v-chip v-if="item.violations > 0" size="small" color="red">
              {{ item.violations }}
            </v-chip>
            <span v-else>0</span>
          </template>
          <template v-slot:[`item.repositories`]="{ item }">
            <v-chip v-for="repo in item.repositories" :key="repo" size="x-small" class="mr-1">
              {{ repo }}
            </v-chip>
          </template>
        </v-data-table>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script lang="ts" setup>
import type { PackageAlertSummary } from "@/services/dependencyAlerts";

const props = defineProps<{
  packageSummaries: PackageAlertSummary[];
  title?: string;
}>();

const headers = [
  { title: "Package", key: "package", sortable: true },
  { title: "Total Alerts", key: "totalAlerts", sortable: true },
  { title: "Open Alerts", key: "openAlerts", sortable: true },
  { title: "Severity Breakdown", key: "severity", sortable: false },
  { title: "Violations", key: "violations", sortable: true },
  { title: "Repositories", key: "repositories", sortable: false },
];

const getSeverityColor = (severity: string): string => {
  const severityColors: Record<string, string> = {
    critical: "red-darken-4",
    high: "deep-orange-darken-1",
    medium: "yellow-darken-4",
    low: "blue",
  };
  return severityColors[severity.toLowerCase()] || "grey";
};
</script>

<style scoped>
.v-chip {
  font-weight: 500;
}
</style>
