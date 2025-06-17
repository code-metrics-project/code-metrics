<template>
  <v-combobox
    name="workloads"
    v-model="workloads"
    :items="options"
    :disabled="busy"
    :label="label"
    @update:model-value="onChange"
    :multiple="multiSelect"
    small-chips
    hide-details
  />
</template>

<script lang="ts" setup>
import { OperationState } from "@/utils/ui";
import { listWorkloadIds } from "@/utils/config";
import { getDefaultValue, InputType } from "@/queries/inputs";
import type { CommonInputProps } from "@/components/inputs/CommonInputProps";
import { computed, onMounted, ref } from "vue";

const DEFAULT_WORKLOADS = getDefaultValue<string[]>(InputType.WORKLOAD_NAMES);

type Props = CommonInputProps<string[]> & {
  includeAllOption?: boolean;
  multiSelect?: boolean;
  operationState?: OperationState;
};

function getInitialWorkloads(props: Props): string | string[] | null {
  if (props.defaults && props.defaults.length > 0) {
    return props.defaults as string[];
  }

  if (props.includeAllOption) {
    return DEFAULT_WORKLOADS;
  }

  return props.multiSelect ? [] : null;
}

const props = withDefaults(defineProps<Props>(), {
  includeAllOption: true,
  multiSelect: true,
  operationState: OperationState.Idle,
});

const emit = defineEmits<{
  (e: "input", workloads: string | string[] | null): void;
}>();

const busy = computed(() => props.operationState === OperationState.Busy);
const label = computed(() => (props.multiSelect ? "Workloads" : "Workload"));
const options = computed(() => {
  const temp = [];
  if (props.includeAllOption) {
    temp.push("all");
  }
  temp.push(...listWorkloadIds());
  return temp;
});
const workloads = ref(getInitialWorkloads(props));

function onChange() {
  emit("input", workloads.value);
}

onMounted(() => {
  onChange();
});
</script>
