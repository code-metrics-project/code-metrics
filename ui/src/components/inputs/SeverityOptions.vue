<template>
  <v-card-subtitle>Severity options</v-card-subtitle>
  <v-checkbox
    v-model="severityOptions.splitBySeverity"
    :disabled="busy"
    label="Split results by severity"
    @update:model-value="onChange"
    hide-details
  />
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { OperationState } from "@/utils/ui";
import {
  getDefaultValue,
  InputType,
  type SeverityOptionsInput,
} from "@/queries/inputs";
import type { CommonInputProps } from "@/components/inputs/CommonInputProps";

type TProps = CommonInputProps<SeverityOptionsInput> & {
  operationState?: OperationState;
};

const props = withDefaults(defineProps<TProps>(), {
  defaults: () =>
    getDefaultValue<SeverityOptionsInput>(InputType.SEVERITY_OPTIONS),

  operationState: OperationState.Idle,
});

const emit = defineEmits(["input"]);
const severityOptions = ref(props.defaults);

function onChange() {
  emit("input", severityOptions.value);
}

const busy = computed(() => {
  return props.operationState === OperationState.Busy;
});
</script>
