<template>
  <DatePicker
    v-model="date"
    :label="props.label"
    :arg-name="props.argName"
    :operation-state="props.operationState"
    @input="onChange"
  />
</template>

<script lang="ts" setup>
import { OperationState } from "@/utils/ui";
import { getDefaultValue, InputType } from "@/queries/inputs";
import DatePicker from "@/components/DatePicker.vue";
import { ref } from "vue";
import type { CommonInputProps } from "@/components/inputs/CommonInputProps";

type TProps = CommonInputProps<string> & {
  operationState?: OperationState;
  label?: string;
  argName?: "startDate" | "endDate";
};

const props: TProps = withDefaults(defineProps<TProps>(), {
  // TODO this should depend on the argName
  defaults: () => getDefaultValue<string>(InputType.START_DATE),

  operationState: OperationState.Idle,
  label: () => "Start date",
  argName: () => "startDate",
});

const emit = defineEmits(["input"]);

const date = ref<Date>(new Date(props.defaults));

function onChange() {
  emit("input", date.value);
}
</script>
