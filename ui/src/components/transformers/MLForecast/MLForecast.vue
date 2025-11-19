<template>
  <v-container fluid>
    <DatePicker
      v-model="trainingDataStartDate"
      :disabled="busy"
      :label="$t(`transformers.label.ml-forecast.training-start`)"
      @update:modelValue="onChange"
    />
    <DatePicker
      v-model="forecastStartDate"
      :disabled="busy"
      :label="$t(`transformers.label.ml-forecast.forecast-start`)"
      @update:modelValue="onChange"
    />
    <DatePicker
      v-model="forecastEndDate"
      :disabled="busy"
      :label="$t(`transformers.label.ml-forecast.forecast-end`)"
      @update:modelValue="onChange"
    />
    <v-combobox
      v-model="forecastModel"
      :disabled="busy"
      :items="models"
      :label="$t(`transformers.label.ml-forecast.forecast-model`)"
      @update:modelValue="onChange"
    />
  </v-container>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import DatePicker from "@/components/DatePicker.vue";
import { OperationState } from "@/utils/ui";
import { getRelativeDate } from "@/utils/date";

type Props = {
  default?: {
    forecastEndDate?: Date;
    forecastModel?: string;
    forecastStartDate?: Date;
    trainingDataStartDate?: Date;
  };
  operationState?: OperationState;
};

const props = defineProps<Props>();
const emit = defineEmits(["update:modelValue"]);
const busy = computed(() => props.operationState === OperationState.Busy);

const models = ["model1", "model2"];

const forecastEndDate = ref<Date>(props.default?.forecastEndDate || getRelativeDate(new Date(), +30));
const forecastModel = ref<string>(props.default?.forecastModel || models[0]);
const forecastStartDate = ref<Date>(props.default?.forecastStartDate || new Date());
const trainingDataStartDate = ref<Date>(props.default?.trainingDataStartDate || getRelativeDate(new Date(), -180));

function onChange() {
  emit("update:modelValue", {
    forecastEndDate: forecastEndDate.value,
    forecastModel: forecastModel.value,
    forecastStartDate: forecastStartDate.value,
    trainingDataStartDate: trainingDataStartDate.value,
  });
}

// Call immediately to set defaults
onChange();
</script>
