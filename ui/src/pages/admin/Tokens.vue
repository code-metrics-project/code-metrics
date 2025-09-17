<template>
  <div>
    <v-sheet color="accent">
      <v-container>
        <v-row>
          <v-col>
            <v-breadcrumbs :items="breadcrumbItems"></v-breadcrumbs>
            <h2 class="text-h2 pb-4">Service Tokens</h2>
            <p class="text-body-1 text-medium-emphasis">
              Manage API service tokens for automated systems and background processes. Service tokens provide secure,
              long-lived access to the CodeMetrics API.
            </p>
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true"> Create Token </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>

    <v-container>
      <v-row>
        <v-col>
          <!-- Token List -->
          <v-card>
            <v-card-title>
              <v-icon class="mr-2">mdi-key-variant</v-icon>
              Active Service Tokens
            </v-card-title>

            <v-data-table :headers="headers" :items="tokens" :loading="loading" item-key="tokenId" class="elevation-1">
              <template v-slot:item.created="{ item }">
                {{ formatDate(item.created) }}
              </template>

              <template v-slot:item.expires="{ item }">
                <v-chip :color="isExpiringSoon(item.expires) ? 'warning' : 'success'" size="small">
                  {{ formatDate(item.expires) }}
                </v-chip>
              </template>

              <template v-slot:item.actions="{ item }">
                <v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="confirmRevoke(item)"> </v-btn>
              </template>

              <template v-slot:no-data>
                <div class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-key-off</v-icon>
                  <p class="text-h6 mb-2">No service tokens found</p>
                  <p class="text-body-2 text-medium-emphasis">
                    Create your first service token to get started with API access.
                  </p>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Create Token Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-plus</v-icon>
          Create Service Token
        </v-card-title>

        <v-card-text>
          <v-form ref="createForm" v-model="createFormValid">
            <v-text-field
              v-model="newTokenSubject"
              label="Subject/Service Name"
              hint="A descriptive name for the service or application that will use this token"
              persistent-hint
              :rules="subjectRules"
              required
            ></v-text-field>
          </v-form>

          <v-alert v-if="newTokenValue" type="success" class="mt-4" prominent>
            <v-alert-title>Token Created Successfully!</v-alert-title>
            <div class="mt-2">
              <p class="text-body-2 mb-2">
                <strong>Important:</strong> Copy this token now. For security reasons, it won't be shown again.
              </p>
              <v-text-field
                :model-value="newTokenValue"
                label="Service Token"
                readonly
                variant="outlined"
                density="compact"
                append-inner-icon="mdi-content-copy"
                @click:append-inner="copyToken"
              ></v-text-field>
            </div>
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="closeCreateDialog">
            {{ newTokenValue ? "Done" : "Cancel" }}
          </v-btn>
          <v-btn
            v-if="!newTokenValue"
            color="primary"
            :loading="creating"
            :disabled="!createFormValid"
            @click="createToken"
          >
            Create Token
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Revoke Confirmation Dialog -->
    <v-dialog v-model="showRevokeDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          Revoke Service Token?
        </v-card-title>

        <v-card-text>
          <p>Are you sure you want to revoke this service token?</p>
          <div v-if="tokenToRevoke" class="mt-2">
            <strong>Subject:</strong> {{ tokenToRevoke.sub }}<br />
            <strong>Created:</strong> {{ formatDate(tokenToRevoke.created) }}
          </div>
          <v-alert type="warning" class="mt-3" density="compact">
            This action cannot be undone. Any applications using this token will lose access immediately.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showRevokeDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="revoking" @click="revokeToken"> Revoke Token </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000">
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn color="white" variant="text" @click="snackbar.show = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from "vue";
import axios from "@/utils/axios";
import { Paths } from "@/router/paths";

interface ServiceToken {
  tokenId: string;
  created: string;
  expires: string;
  sub: string;
  createdBy: string;
}

// Data
const tokens = ref<ServiceToken[]>([]);
const loading = ref(false);
const showCreateDialog = ref(false);
const showRevokeDialog = ref(false);
const creating = ref(false);
const revoking = ref(false);
const createFormValid = ref(false);
const newTokenSubject = ref("");
const newTokenValue = ref("");
const tokenToRevoke = ref<ServiceToken | null>(null);

const snackbar = ref({
  show: false,
  message: "",
  color: "success",
});

// Table headers
const headers = [
  { title: "Subject", key: "sub", sortable: true },
  { title: "Created", key: "created", sortable: true },
  { title: "Expires", key: "expires", sortable: true },
  { title: "Created By", key: "createdBy", sortable: true },
  { title: "Actions", key: "actions", sortable: false, align: "end" as const },
] as const;

// Validation rules
const subjectRules = [
  (v: string) => !!v || "Subject is required",
  (v: string) => (v && v.length >= 3) || "Subject must be at least 3 characters",
  (v: string) => (v && v.length <= 50) || "Subject must be less than 50 characters",
];

// Breadcrumb items
const breadcrumbItems = computed(() => [
  {
    title: "Admin",
    to: Paths.AdminHome,
  },
  {
    title: "Service Tokens",
    to: Paths.AdminTokens,
  },
]);

// Methods
const loadTokens = async () => {
  loading.value = true;
  try {
    const response = await axios.get("/api/tokens");
    tokens.value = response.data;
  } catch (error) {
    showSnackbar("Failed to load service tokens", "error");
    console.error("Error loading tokens:", error);
  } finally {
    loading.value = false;
  }
};

const createToken = async () => {
  if (!createFormValid.value) return;

  creating.value = true;
  try {
    const response = await axios.post("/api/tokens", {
      subject: newTokenSubject.value,
    });

    newTokenValue.value = response.data.accessToken;

    // Reload tokens list
    await loadTokens();

    showSnackbar("Service token created successfully", "success");
  } catch (error) {
    showSnackbar("Failed to create service token", "error");
    console.error("Error creating token:", error);
  } finally {
    creating.value = false;
  }
};

const confirmRevoke = (token: ServiceToken) => {
  tokenToRevoke.value = token;
  showRevokeDialog.value = true;
};

const revokeToken = async () => {
  if (!tokenToRevoke.value) return;

  revoking.value = true;
  try {
    await axios.delete(`/api/tokens/${tokenToRevoke.value.tokenId}`);

    showRevokeDialog.value = false;
    tokenToRevoke.value = null;

    // Reload tokens list
    await loadTokens();

    showSnackbar("Service token revoked successfully", "success");
  } catch (error) {
    showSnackbar("Failed to revoke service token", "error");
    console.error("Error revoking token:", error);
  } finally {
    revoking.value = false;
  }
};

const closeCreateDialog = () => {
  showCreateDialog.value = false;
  newTokenSubject.value = "";
  newTokenValue.value = "";
  createFormValid.value = false;
};

const copyToken = async () => {
  try {
    await navigator.clipboard.writeText(newTokenValue.value);
    showSnackbar("Token copied to clipboard", "success");
  } catch (error) {
    showSnackbar("Failed to copy token", "error");
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isExpiringSoon = (expiresString: string) => {
  const expires = new Date(expiresString);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return expires <= thirtyDaysFromNow;
};

const showSnackbar = (message: string, color: string = "success") => {
  snackbar.value = { show: true, message, color };
};

// Lifecycle
onMounted(() => {
  loadTokens();
});
</script>
