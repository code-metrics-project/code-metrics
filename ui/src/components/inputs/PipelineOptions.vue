<template>
  <v-card-subtitle class="pl-0 mb-2">Pipeline values</v-card-subtitle>
  <v-select
    v-model="valueFormat"
    :items="valueFormatItems"
    :disabled="busy"
    item-text="title"
    item-value="value"
    label="Select"
    persistent-hint
    single-line
    hide-details
  ></v-select>
</template>

<script lang="ts">
import { OperationState } from "@/utils/ui";
import { getDefaultValue, InputType, ValueFormat } from "@/queries/inputs";

export default {
  props: {
    operationState: {
      type: Number as () => OperationState,
      default: () => OperationState.Idle,
    },
  },

  created() {
    this.$emit("input", this.valueFormat);
  },

  data() {
    return {
      valueFormat: getDefaultValue<ValueFormat>(InputType.PIPELINE_OPTIONS),
      valueFormatItems: [
        { title: "Count by outcome", value: ValueFormat.COUNT },
        { title: "Success percentage", value: ValueFormat.PERCENTAGE },
      ],
    };
  },

  computed: {
    busy(): boolean {
      return this.operationState === OperationState.Busy;
    },
  },

  watch: {
    valueFormat: function (value) {
      this.$emit("input", value);
    },
  },
};
</script>
