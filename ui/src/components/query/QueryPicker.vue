<template>
  <v-combobox
    name="queryTypes"
    v-model="selected"
    :items="options"
    :disabled="busy"
    :label="label"
    :multiple="multiple"
    :deletable-chips="deletableChips"
    small-chips
    hide-details
    @update:model-value="onChange"
  >
    <template v-slot:item="{ item, props }">
      <v-list-item
        v-bind="props"
        :subtitle="item.raw.description"
        :title="item.raw.title"
      />
    </template>
  </v-combobox>
</template>

<script lang="ts">
// @ts-nocheck
import { OperationState } from "@/utils/ui";
import { listQueryTypes } from "@/queries/config";

type QueryEntry = {
  description: string;
  text: string;
  value: string;
};

export default {
  props: {
    default: {
      default: () => [],
    },
    deletableChips: {
      type: Boolean,
      default: () => false,
    },
    label: {
      type: String,
      default: () => "Data sources",
    },
    multiple: {
      type: Boolean,
      default: () => false,
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
    const queryOptions = listQueryTypes()
      .map((q) => {
        return {
          selected: null as QueryEntry | QueryEntry[] | null,
          description: this.$t(`queries.description.${q.name}`) as string,
          title: this.$t(`queries.title.${q.name}`) as string,
          value: q.name,
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    let defaultSelected;
    if (this.multiple) {
      defaultSelected = queryOptions.filter((qo) =>
        (this.default as string[]).includes(qo.value),
      );
    } else {
      defaultSelected = queryOptions.find(
        (qo) => (this.default as unknown as string) === qo.value,
      );
    }

    return {
      options: queryOptions,
      selected: defaultSelected,
    };
  },

  computed: {
    busy() {
      return this.operationState === OperationState.Busy;
    },
  },

  methods: {
    onChange() {
      let value;
      if (this.multiple) {
        value = (this.selected as QueryEntry[])?.map((q) => q.value);
      } else {
        value = (this.selected as QueryEntry)?.value;
      }
      this.$emit("update-query", value);
    },
  },
};
</script>

<style scoped>
.query-title {
  margin: 0;
}
.query-description {
  color: #777;
  display: block;
  font-size: 0.75em;
  margin: 0;
}
</style>
