<template>
  <v-combobox
    name="branches"
    v-model="branches"
    :items="options"
    :disabled="busy"
    label="Branches"
    @update:model-value="onChange"
    multiple
    small-chips
    hide-details
  />
</template>

<script lang="ts">
import { OperationState } from "@/utils/ui";
import { getConfig } from "@/utils/config";
import { getDefaultValue, InputType } from "@/queries/inputs";

export default {
  props: {
    defaults: {
      type: Array as () => string[],
      default: () => getDefaultValue<string[]>(InputType.BRANCH_NAMES),
    },
    operationState: {
      type: Number as () => OperationState,
      default: () => OperationState.Idle,
    },
  },

  created() {
    this.onChange();
  },

  data() {
    return {
      branches: this.defaults,
      options: getConfig().systemConfig.branches,
    };
  },

  computed: {
    busy(): boolean {
      return this.operationState === OperationState.Busy;
    },
  },

  methods: {
    onChange() {
      this.$emit("input", this.branches);
    },
  },
};
</script>
