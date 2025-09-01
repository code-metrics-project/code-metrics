<template>
  <div>
    <v-select
      v-if="filters.includes('priority')"
      id="issue-priority"
      :disabled="busy"
      v-model="priority"
      :items="priorities"
      :label="priorityLabel"
      hide-details
      @update:model-value="onChange"
    />
  </div>
</template>

<script lang="ts">
import { OperationState } from "@/utils/ui";
import { getIssuePriorities } from "@/services/issues";
import { getDefaultValue, InputType, type IssueFilterInputs } from "@/queries/inputs";

const issuePriorities = getIssuePriorities();

function suggestStartingPriority() {
  // pick one above the lowest, if present
  return issuePriorities.length > 0 ? issuePriorities[Math.min(1, issuePriorities.length)].value : undefined;
}

export default {
  props: {
    filters: {
      type: Array as () => string[],
      default: () => ["priority"],
    },
    defaults: {
      type: Object as () => Partial<IssueFilterInputs>,
      default: () => {
        return getDefaultValue<Partial<IssueFilterInputs>>(InputType.ISSUE_FILTER);
      },
    },
    priorityLabel: {
      type: String,
      default: () => "At/above priority",
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
      priority: this.defaults?.priority ?? suggestStartingPriority(),
      priorities: issuePriorities,
    };
  },

  computed: {
    busy(): boolean {
      return this.operationState === OperationState.Busy;
    },
  },

  methods: {
    onChange() {
      const input: IssueFilterInputs = {
        priority: this.priority,
      };
      this.$emit("input", input);
    },
  },
};
</script>
