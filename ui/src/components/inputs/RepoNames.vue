<template>
  <v-combobox
    name="repoNames"
    v-model="repoNames"
    :items="options"
    :disabled="busy"
    label="Repository Names"
    multiple
    small-chips
    @update:model-value="onChange"
    hide-details
  />
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import { OperationState } from "@/utils/ui";
import { getReposForWorkloadId, listWorkloadIds } from "@/utils/config";
import { getDefaultValue, InputType } from "@/queries/inputs";
import type { CommonInputProps } from "@/components/inputs/CommonInputProps";

type TProps = CommonInputProps<string[]> & {
  workloadIds?: string[];
  operationState?: OperationState;
};

const props = withDefaults(defineProps<TProps>(), {
  defaults: () => getDefaultValue<string[]>(InputType.REPO_NAMES),
  workloadIds: () => [],
  operationState: OperationState.Idle,
});

const emit = defineEmits(["input"]);

const options = ref<string[]>([]);
const repoNames = ref(props.defaults);

const busy = computed(() => {
  return props.operationState === OperationState.Busy;
});

const updateOptions = () => {
  // If no workloads are provided, get all repos from all workloads
  const workloadIdsToQuery =
    !props.workloadIds || props.workloadIds.length === 0 ? listWorkloadIds() : props.workloadIds;

  const allRepos = workloadIdsToQuery.flatMap((workloadId) => getReposForWorkloadId(workloadId));
  options.value = [...new Set(allRepos)].sort();
};

const onChange = () => {
  emit("input", repoNames.value);
};

watch(() => props.workloadIds, updateOptions);

onMounted(() => {
  updateOptions();
  onChange();
});
</script>
