<template>
  <v-combobox
    v-model="selected"
    :items="options"
    :disabled="busy"
    label="Datapoints"
    @input="onChange"
    multiple
    small-chips
  />
</template>

<script lang="ts">
import { defineComponent, computed, ref } from "vue";
import { OperationState } from "@/utils/ui";

type Option = {
  text: string;
  value: number;
}

const OPTIONS: Option[] = [
  {
    text: "All",
    value: 0,
  },
  {
    text: "4-week rolling average",
    value: 4 * 7,
  },
  {
    text: "12-week rolling average",
    value: 12 * 7,
  },
];

export default defineComponent({
  props: {
    label: {
      type: String,
      default: () => "How many data points do you want to show?",
    },
    operationState: {
      type: Number as () => OperationState,
      default: () => OperationState.Idle,
    },
    defaults: {
      type: Array as () => Array<Option>,
      default: () => [OPTIONS[0]],
    },
  },

  setup(props, context) {
    const busy = computed(() => props.operationState === OperationState.Busy);

    const selected = ref<Option[]>(props.defaults);

    function onChange() {
      context.emit("input", selected.value.map((sel) => sel.value));
    }
    // Call immediately to set defaults
    onChange();

    return {
      busy,
      onChange,
      options: OPTIONS,
      selected,
    };
  },
});
</script>
