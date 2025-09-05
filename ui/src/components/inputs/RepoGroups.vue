<template>
  <v-combobox
    name="repoGroups"
    v-model="repoGroups"
    :items="options"
    :disabled="busy"
    label="Repository Groups"
    multiple
    small-chips
    @update:model-value="onChange"
    hide-details
  />
</template>

<script lang="ts">
import { OperationState } from "@/utils/ui";
import { listRepoGroups } from "@/utils/config";
import { getDefaultValue, InputType } from "@/queries/inputs";

export default {
  props: {
    defaults: {
      type: Array as () => string[],
      default: () => getDefaultValue<string[]>(InputType.REPO_GROUPS),
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
      options: [...listRepoGroups()],
      repoGroups: this.defaults as string[],
    };
  },

  computed: {
    busy(): boolean {
      return this.operationState === OperationState.Busy;
    },
  },

  methods: {
    onChange() {
      this.$emit("input", this.repoGroups);
    },
  },
};
</script>
