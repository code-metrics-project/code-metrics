<template>
  <v-combobox
    name="jobGroups"
    v-model="groups"
    :items="options"
    :disabled="busy"
    label="Job Groups"
    multiple
    small-chips
    @update:model-value="onChange"
    hide-details
  />
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { OperationState } from "@/utils/ui";
import { listJobGroups } from "@/utils/config";
import { getDefaultValue, InputType } from "@/queries/inputs";
import type { CommonInputProps } from "@/components/inputs/CommonInputProps";

type TProps = CommonInputProps<string[]> & {
  operationState?: OperationState;
};

const props = withDefaults(defineProps<TProps>(), {
  defaults: () => getDefaultValue<string[]>(InputType.JOB_GROUPS),
  operationState: OperationState.Idle,
});
const emit = defineEmits(["input"]);
const groups = ref(props.defaults);

function onChange() {
  emit("input", groups.value);
}

const options = [...listJobGroups()];

const busy = computed(() => {
  return props.operationState === OperationState.Busy;
});
</script>
