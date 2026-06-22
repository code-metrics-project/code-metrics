<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col>
            <v-breadcrumbs :items="breadcrumbItems"></v-breadcrumbs>
            <div class="d-flex justify-space-between align-center">
              <div>
                <h2 class="text-h2 pb-4">Remote Connections</h2>
                <p class="text-body-1 text-medium-emphasis">
                  Check connectivity to all configured remote servers and services. This dashboard displays real-time
                  connection status for version control, pipelines, code analysis, ticket management, and LLM services.
                </p>
              </div>
              <v-btn color="primary" prepend-icon="mdi-refresh" :loading="loading" @click="loadConnections">
                Refresh
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <v-card>
            <v-card-title>
              <v-icon class="mr-2">mdi-server-network</v-icon>
              Connection Status
              <v-spacer></v-spacer>
              <span v-if="checkedAt" class="text-caption text-medium-emphasis">
                Last checked: {{ formatTimestamp(checkedAt) }}
              </span>
            </v-card-title>

            <v-data-table
              :headers="headers"
              :items="results"
              :loading="loading"
              item-key="id"
              class="elevation-1"
              :items-per-page="25"
            >
              <template v-slot:item.category="{ item }">
                {{ formatCategory(item.category) }}
              </template>

              <template v-slot:item.type="{ item }">
                <span class="font-monospace text-body-2">{{ item.type }}</span>
              </template>

              <template v-slot:item.url="{ item }">
                <span v-if="item.url" class="font-monospace text-body-2" :title="item.url">
                  {{ item.url }}
                </span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <template v-slot:item.status="{ item }">
                <v-chip :color="getStatusColor(item.status)" size="small">
                  {{ getStatusLabel(item.status) }}
                </v-chip>
              </template>

              <template v-slot:item.statusDetail="{ item }">
                <span v-if="item.statusDetail" class="text-body-2" :title="item.statusDetail">
                  {{ item.statusDetail }}
                </span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <template v-slot:item.responseTimeMs="{ item }">
                <span v-if="item.responseTimeMs !== undefined" class="font-monospace text-body-2">
                  {{ item.responseTimeMs }}ms
                </span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <template v-slot:no-data>
                <div class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-server-network-off</v-icon>
                  <p class="text-h6 mb-2">No remote connections configured</p>
                  <p class="text-body-2 text-medium-emphasis">
                    Configure remote servers in your remote-config.yaml file to see connection status.
                  </p>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { Paths } from "@/router/paths";
import { checkRemoteConnections } from "@/services/remoteConnections";

type ConnectionStatus = "connected" | "unreachable" | "unauthorised" | "error" | "unconfigured" | "rateLimited";

interface ConnectionCheckResult {
  id: string;
  category: string;
  type: string;
  url?: string;
  status: ConnectionStatus;
  statusDetail?: string;
  responseTimeMs?: number;
}

const breadcrumbItems = [
  {
    title: "Administration",
    to: Paths.AdminHome,
  },
  {
    title: "Remote Connections",
    disabled: true,
  },
];

const headers = [
  { title: "Server ID", key: "id", sortable: true },
  { title: "Category", key: "category", sortable: true },
  { title: "Type", key: "type", sortable: true },
  { title: "URL", key: "url", sortable: false },
  { title: "Status", key: "status", sortable: true },
  { title: "Detail", key: "statusDetail", sortable: false },
  { title: "Response Time", key: "responseTimeMs", sortable: true, align: "end" as const },
];

const results = ref<ConnectionCheckResult[]>([]);
const checkedAt = ref<string>("");
const loading = ref(true);

const loadConnections = async () => {
  loading.value = true;
  try {
    const data = await checkRemoteConnections();
    results.value = data.results;
    checkedAt.value = data.checkedAt;
  } catch (error) {
    console.error("Failed to check remote connections:", error);
  } finally {
    loading.value = false;
  }
};

const formatCategory = (category: string): string => {
  return category.replace(/([A-Z])/g, " $1").trim();
};

const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

const getStatusColor = (status: ConnectionStatus): string => {
  const statusColors: Record<ConnectionStatus, string> = {
    connected: "green",
    unreachable: "red",
    unauthorised: "amber",
    error: "red",
    unconfigured: "grey",
    rateLimited: "orange",
  };
  return statusColors[status] || "grey";
};

const getStatusLabel = (status: ConnectionStatus): string => {
  const statusLabels: Record<ConnectionStatus, string> = {
    connected: "Connected",
    unreachable: "Unreachable",
    unauthorised: "Unauthorised",
    error: "Error",
    unconfigured: "Unconfigured",
    rateLimited: "Rate Limited",
  };
  return statusLabels[status] || status;
};

onMounted(() => {
  loadConnections();
});
</script>
