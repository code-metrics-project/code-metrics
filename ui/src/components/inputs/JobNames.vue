<template>
  <v-combobox
    name="jobNames"
    v-model="jobNames"
    :items="options"
    :disabled="busy"
    label="Job Names"
    multiple
    small-chips
    @update:model-value="onChange"
    hide-details
  />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { OperationState } from "@/utils/ui";
import { getJobsForWorkloadId, listWorkloadIds } from "@/utils/config";
import { getDefaultValue, InputType } from "@/queries/inputs";
import type { CommonInputProps } from "@/components/inputs/CommonInputProps";

type TProps = CommonInputProps<string[]> & {
  workloadIds?: string[];
  operationState?: OperationState;
};

const props = withDefaults(defineProps<TProps>(), {
  defaults: () => getDefaultValue<string[]>(InputType.JOB_NAMES),
  workloadIds: () => [],
  operationState: OperationState.Idle,
});

const emit = defineEmits(["input"]);

const options = ref<string[]>([]);
const jobNames = ref(props.defaults);

const busy = computed(() => {
  return props.operationState === OperationState.Busy;
});

const updateOptions = () => {
  // If no workloads are provided, get all jobs from all workloads
  const workloadIdsToQuery =
    !props.workloadIds || props.workloadIds.length === 0 ? listWorkloadIds() : props.workloadIds;

  const allJobs = workloadIdsToQuery.flatMap((workloadId) => getJobsForWorkloadId(workloadId));
  options.value = [...new Set(allJobs)].sort();
};

const onChange = () => {
  emit("input", jobNames.value);
};

watch(() => props.workloadIds, updateOptions);

onMounted(() => {
  updateOptions();
  onChange();
});
</script>
