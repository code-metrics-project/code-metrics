<template>
  <v-card>
    <v-card-title>Dependency Alerts</v-card-title>
    <v-card-subtitle
      >View dependency vulnerability alerts and SLA compliance for repositories or repository groups.</v-card-subtitle
    >
    <v-card-text>
      <v-row>
        <v-col cols="9">
          <v-row>
            <v-col cols="12">
              <workload-names
                :defaults="workloads"
                @input="(w: string[] | string | null) => (workloads = Array.isArray(w) ? w : w ? [w] : [])"
                :operationState="operationState"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col>Choose repository groups, or a single repository.</v-col>
          </v-row>
          <v-row>
            <v-col cols="6">
              <repo-groups
                :defaults="repoGroupsInput"
                @input="(rg) => (repoGroupsInput = rg)"
                :operationState="repoNameInput ? OperationState.Busy : operationState"
              />
            </v-col>
            <v-col cols="6">
              <v-combobox
                v-model="repoNameInput"
                label="Repository Name"
                :disabled="busy || repoGroupsInput.length > 0"
                hint="Select a single repository name"
                persistent-hint
                :items="repoNames"
                :multiple="false"
              />
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-btn :disabled="busy" @click="fetchAlerts" color="primary" class="mr-2">
            {{ fetchLabel }}
          </v-btn>
          <v-progress-circular v-if="busy" :model-value="progress" color="primary" :width="4" :size="32" class="mr-3" />
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-title v-if="analyses.length > 0"> Alert Summary </v-card-title>

    <v-sheet color="grey-lighten-4" v-if="totalSummary">
      <v-card-item>
        <v-card-subtitle class="subtitle-1 font-weight-bold">Overall Summary</v-card-subtitle>
      </v-card-item>
      <v-card-text>
        <span class="font-weight-medium">{{ totalSummary.total }} total alerts</span>
        <span class="ml-4">
          <v-icon color="red" class="mr-1">mdi-alert-circle</v-icon>
          Open Violations: {{ totalSummary.openViolations }}
        </span>
        <span class="ml-4">
          <v-icon color="green" class="mr-1">mdi-check-circle</v-icon>
          Compliance: {{ totalSummary.complianceRate }}%
        </span>
      </v-card-text>
    </v-sheet>

    <package-alerts-table
      v-if="aggregatedPackages.length > 0"
      :package-summaries="aggregatedPackages"
      title="Alerts by Package (All Repositories)"
    />

    <div v-for="analysis in analyses" :key="`${analysis.workloadId}-${analysis.repo}`">
      <v-card-title class="mt-4">
        {{ analysis.workloadId }} - {{ analysis.repo }}
        <v-chip class="ml-2" size="small" color="grey"> {{ analysis.total }} alerts </v-chip>
        <v-chip v-if="analysis.warningMessage" class="ml-2" size="small" color="warning" prepend-icon="mdi-alert">
          {{ analysis.warningMessage }}
        </v-chip>
      </v-card-title>

      <v-sheet color="grey-lighten-4">
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2">By State</div>
              <div v-for="(count, state) in analysis.byState" :key="state">
                <v-chip size="small" class="mr-1">{{ state }}</v-chip>
                {{ count }}
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2">By Severity</div>
              <div v-for="severity in orderedSeverities" :key="severity">
                <div v-if="analysis.bySeverity[severity]">
                  <v-chip size="small" class="mr-1" :color="getSeverityColor(severity)">
                    {{ severity }}
                  </v-chip>
                  {{ analysis.bySeverity[severity] }}
                </div>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-subtitle-2">SLA Compliance</div>
              <div v-if="analysis.warningMessage">
                <v-icon color="grey" class="mr-1">
                  mdi-help-circle
                </v-icon>
                Unknown
              </div>
              <div v-else>
                <v-icon :color="analysis.summary.openViolations > 0 ? 'red' : 'green'" class="mr-1">
                  {{ analysis.summary.openViolations > 0 ? "mdi-alert-circle" : "mdi-check-circle" }}
                </v-icon>
                {{ analysis.summary.complianceRate }}% compliant
              </div>
              <div v-if="!analysis.warningMessage && analysis.summary.openViolations > 0">
                <v-chip size="small" color="red" class="mt-1">
                  {{ analysis.summary.openViolations }} open violations
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-sheet>

      <v-data-table
        v-if="analysis.slaViolations.length > 0"
        :headers="violationHeaders"
        :items="analysis.slaViolations"
        :sort-by="[{ key: 'daysOverdue', order: 'desc' }]"
        class="elevation-1 mt-2"
        density="comfortable"
      >
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>SLA Violations</v-toolbar-title>
          </v-toolbar>
        </template>
        <template v-slot:[`item.severity`]="{ item }">
          <v-chip size="small" :color="getSeverityColor(item.severity)">
            {{ item.severity }}
          </v-chip>
        </template>
        <template v-slot:[`item.state`]="{ item }">
          <v-chip size="small" :color="item.state === 'open' ? 'red' : 'grey'">
            {{ item.state }}
          </v-chip>
        </template>
        <template v-slot:[`item.htmlUrl`]="{ item }">
          <v-btn variant="text" size="small" :href="item.htmlUrl" target="_blank" icon="mdi-open-in-new" />
        </template>
      </v-data-table>

      <package-alerts-table
        v-if="Object.keys(analysis.byPackage).length > 0"
        :package-summaries="Object.values(analysis.byPackage)"
        :title="`Alerts by Package (${analysis.repo})`"
      />
    </div>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from "vue";
import WorkloadNames from "@/components/inputs/WorkloadNames.vue";
import RepoGroups from "@/components/inputs/RepoGroups.vue";
import PackageAlertsTable from "@/components/dependencyAlerts/PackageAlertsTable.vue";
import { OperationState } from "@/utils/ui";
import { logger } from "@/utils/logger";
import { fetchDependencyAlerts, aggregatePackageAlerts, type DependencyAlertsAnalysis } from "@/services/dependencyAlerts";
import { getReposForWorkloadId, listWorkloadIds } from "@/utils/config";

const violationHeaders = [
  { title: "Alert #", key: "number", sortable: true },
  { title: "Severity", key: "severity", sortable: true },
  { title: "State", key: "state", sortable: true },
  { title: "Package", key: "package", sortable: true },
  { title: "Title", key: "title", sortable: false },
  { title: "Age (days)", key: "age", sortable: true },
  { title: "SLA (days)", key: "slaLimit", sortable: true },
  { title: "Days Overdue", key: "daysOverdue", sortable: true },
  { title: "Link", key: "htmlUrl", sortable: false },
];

const props = defineProps<{
  workloadIds?: string[];
  repoName?: string;
  repoGroups?: string[];
  executeOnMount?: boolean;
}>();

const workloads = ref<string[]>(props.workloadIds || []);
const repoNameInput = ref<string>((props.repoName as string) || "");
const repoGroupsInput = ref<string[]>(props.repoGroups || []);
const analyses = ref<DependencyAlertsAnalysis[]>([]);
const busy = ref(false);
const progress = ref(0);
const operationState = ref(OperationState.Idle);
const repoNames = ref<string[]>([]);

// Severity order
const orderedSeverities = ["critical", "high", "medium", "low"];

const fetchLabel = computed(() => (busy.value ? "Fetching..." : "Fetch Alerts"));

const totalSummary = computed(() => {
  if (analyses.value.length === 0) return null;

  const total = analyses.value.reduce((sum, a) => sum + a.total, 0);
  const openViolations = analyses.value.reduce((sum, a) => sum + a.summary.openViolations, 0);
  const totalCompliant = analyses.value.reduce((sum, a) => {
    const compliantCount = a.compliant.length + a.slaViolations.filter((v) => v.state !== "open").length;
    return sum + compliantCount;
  }, 0);

  const complianceRate = total > 0 ? ((totalCompliant / total) * 100).toFixed(1) : "100";

  return {
    total,
    openViolations,
    complianceRate,
  };
});

const aggregatedPackages = computed(() => {
  if (analyses.value.length === 0) return [];
  return aggregatePackageAlerts(analyses.value);
});

const getSeverityColor = (severity: string): string => {
  const severityColors: Record<string, string> = {
    critical: "red-darken-4",
    high: "deep-orange-darken-1",
    medium: "yellow-darken-4",
    low: "blue",
  };
  return severityColors[severity.toLowerCase()] || "grey";
};

const fetchAlerts = async () => {
  if (workloads.value.length === 0) {
    logger("No workloads selected");
    return;
  }

  if (!repoNameInput.value && repoGroupsInput.value.length === 0) {
    logger("No repository name or repository groups provided");
    return;
  }

  busy.value = true;
  operationState.value = OperationState.Busy;
  progress.value = 0;

  try {
    logger(`Fetching dependency alerts for workloads: ${workloads.value.join(", ")}`);

    const results = await fetchDependencyAlerts(workloads.value, repoNameInput.value, repoGroupsInput.value);
    analyses.value = results;

    progress.value = 100;
    operationState.value = OperationState.Idle;

    logger(`Fetched ${results.length} workload analyses`);
  } catch (error) {
    logger(`Error fetching dependency alerts: ${error}`);
    operationState.value = OperationState.Error;
  } finally {
    busy.value = false;
  }
};

const updateRepoNames = () => {
  if (workloads.value.length === 0) {
    repoNames.value = [];
    return;
  }

  const allRepos = new Set<string>();
  const workloadIdsToProcess =
    workloads.value.includes("all") || workloads.value[0] === "all"
      ? listWorkloadIds()
      : workloads.value;

  workloadIdsToProcess.forEach((workloadId) => {
    const repos = getReposForWorkloadId(workloadId);
    repos.forEach((repo) => allRepos.add(repo));
  });

  repoNames.value = Array.from(allRepos).sort();
};

watch(workloads, () => {
  updateRepoNames();
  if (repoNameInput.value && !repoNames.value.includes(repoNameInput.value)) {
    repoNameInput.value = "";
  }
});

watch(
  () => props.workloadIds,
  (newVal) => {
    if (newVal) {
      workloads.value = newVal;
    }
  },
);

watch(
  () => props.repoName,
  (newVal) => {
    if (newVal) {
      repoNameInput.value = newVal as string;
    }
  },
);

watch(
  () => props.repoGroups,
  (newVal) => {
    if (newVal) {
      repoGroupsInput.value = newVal;
    }
  },
);

onMounted(() => {
  updateRepoNames();
  if (props.executeOnMount && workloads.value.length > 0 && (repoNameInput.value || repoGroupsInput.value.length > 0)) {
    fetchAlerts();
  }
});
</script>

<style scoped>
.v-chip {
  font-weight: 500;
}
</style>
