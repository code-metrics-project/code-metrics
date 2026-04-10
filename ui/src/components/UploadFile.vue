<template>
  <v-card>
    <v-card-title>Upload vulnerability report</v-card-title>
    <v-card-subtitle>Upload a SARIF format report.</v-card-subtitle>

    <v-card-text v-if="!!alert">
      <AlertMessage :alert="alert" />
    </v-card-text>

    <v-container fluid>
      <v-row>
        <v-col sm="6">
          <v-card-text>
            <WorkloadNames
              :multi-select="false"
              :include-all-option="false"
              defaults=""
              @input="(value) => updateWorkload(value)"
              :disabled="busy"
            />
            <VCombobox
              label="Repo name"
              hint="Override the repo name"
              :multiple="false"
              :items="repoNames"
              v-model="repoName"
            />
            <DatePicker label="Report date" v-model="reportDate" />
            <VFileInput label="SARIF file" v-model="chosenFile" accept=".sarif" :disabled="busy" :multiple="false" />
            <VBtn color="primary" @click.prevent="upload" :disabled="busy || !workload?.length || !chosenFile?.length"
              >Upload
            </VBtn>
          </v-card-text>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { computed, ref } from "vue";
import { OperationState } from "@/utils/ui";
import WorkloadNames from "@/components/inputs/WorkloadNames.vue";
import { client } from "@/utils/apiClient";
import { VULNERABILITIES } from "@/utils/urls";
import DatePicker from "@/components/DatePicker.vue";
import { getTodayDateOnly } from "@/utils/date";
import { getReposForWorkloadId } from "@/utils/config";
import AlertMessage from "@/components/AlertMessage.vue";
import type { Alert } from "@/utils/ui";

type PersistVulnsQueryParams = {
  workload: string;
  repoName?: string;
  reportDate: string;
};

const operationState = ref(OperationState.Idle);
const chosenFile = ref<File[]>();
const alert = ref<Alert>(null);
const repoNames = ref([]);
const repoName = ref("");
const reportDate = ref(getTodayDateOnly());
const workload = ref("");

const upload = async () => {
  operationState.value = OperationState.Busy;
  try {
    if (!chosenFile.value?.length) {
      alert.value = {
        type: "error",
        message: "No SARIF file selected.",
      };
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const params: PersistVulnsQueryParams = {
        workload: workload.value,
        repoName: repoName.value,
        reportDate: reportDate.value, //truncateDateOnly(reportDate.value),
      };
      const response = await client.post(VULNERABILITIES, reader.result, {
        headers: {
          "Content-Type": "application/json", //"application/sarif+json",
        },
        params,
      });

      if (response.status === 201) {
        operationState.value = OperationState.Idle;
      } else {
        alert.value = {
          type: "error",
          message: `HTTP ${response.status} uploading SARIF file`,
        };
      }
    };
    reader.readAsArrayBuffer(chosenFile.value[0]);
  } catch (error) {
    console.error("Failed to run queries", error);
    alert.value = {
      type: "error",
      message: error.message,
    };
  } finally {
    operationState.value = OperationState.Idle;
  }
};

const updateWorkload = (workloadId: string) => {
  workload.value = workloadId;
  repoNames.value = getReposForWorkloadId(workloadId);
};

const busy = computed(() => operationState.value === OperationState.Busy);
</script>
