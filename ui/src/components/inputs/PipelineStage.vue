<template>
  <v-card variant="text">
    <v-card-subtitle class="px-0 mb-2">Pipeline stage</v-card-subtitle>
    <v-btn-toggle
      v-model="stage"
      @update:model-value="onChange"
      tile
      color="primary accent-3"
      group
      mandatory
      density="compact"
      variant="outlined"
    >
      <v-btn v-for="stage in stages" :key="stage" :value="stage" :disabled="busy">
        {{ stage }}
      </v-btn>
    </v-btn-toggle>
  </v-card>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { OperationState } from "@/utils/ui";
import { getDefaultValue, InputType } from "@/queries/inputs";
import type { CommonInputProps } from "@/components/inputs/CommonInputProps";
import { getAllPipelineStages } from "@/queries/config";

type TProps = CommonInputProps<string> & {
  operationState?: OperationState;
};

const props = withDefaults(defineProps<TProps>(), {
  defaults: () => getDefaultValue<string>(InputType.PIPELINE_STAGE),
  operationState: OperationState.Idle,
});
const emit = defineEmits(["input"]);
const stage = ref(props.defaults);

function onChange() {
  emit("input", stage.value);
}

const stages = [...getAllPipelineStages()];

const busy = computed(() => {
  return props.operationState === OperationState.Busy;
});
</script>
