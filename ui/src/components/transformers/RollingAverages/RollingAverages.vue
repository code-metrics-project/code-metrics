<template>
  <v-container fluid>
    <v-checkbox
      v-model="removeOutliers"
      :disabled="busy"
      :label="$t(`transformers.label.rolling-averages.removeOutliers`)"
      @input="onChange"
    />

    <v-text-field
      :label="$t(`transformers.label.rolling-averages.howManyDays`)"
      v-model.number="days"
      type="number"
      :disabled="busy"
      :rules="rules"
      @input="onChange"
    />

    <v-combobox
      v-model="model"
      :disabled="busy"
      :items="models"
      :label="$t(`transformers.label.rolling-averages.model`)"
      @update:modelValue="onChange"
    />
  </v-container>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { OperationState } from "@/utils/ui";

type Props = {
  default?: number;
  operationState?: OperationState;
};

const props = defineProps<Props>();
const emit = defineEmits(["update:modelValue"]);

const busy = computed(() => props.operationState === OperationState.Busy);

const models = ["weighted", "simple"];

const removeOutliers = ref<boolean>(false);
const days = ref<number>(props.default || 1);
const model = ref<string>(models[0]);
const rules = [
  (v: string) => !v || !isNaN(+v) || "Must be a number",
  (v: string) => +v > 0 || "Min 0",
  (v: string) => +v < 200 || "Max 200",
];

function onChange() {
  emit("update:modelValue", {
    days: +days.value,
    model: model.value,
    removeOutliers: removeOutliers.value,
  });
}

onChange();
</script>
