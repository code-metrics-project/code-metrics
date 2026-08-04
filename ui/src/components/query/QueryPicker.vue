<template>
  <v-combobox
    name="queryTypes"
    v-model="selected"
    :items="options"
    :disabled="busy"
    :label="label"
    :multiple="multiple"
    :deletable-chips="deletableChips"
    :return-object="false"
    small-chips
    hide-details
  >
    <template v-slot:item="{ item, props }">
      <v-list-item v-bind="props" :subtitle="item.raw?.description" :title="item.raw?.title" />
    </template>
  </v-combobox>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { OperationState } from "@/utils/ui";
import { listQueryTypes } from "@/queries/config";

const { t } = useI18n();

type QueryEntry = {
  description: string;
  text: string;
  value: string;
};

const options = listQueryTypes()
  .map((q) => {
    return {
      selected: null as QueryEntry | QueryEntry[] | null,
      description: t(`queries.description.${q.name}`) as string,
      title: t(`queries.title.${q.name}`) as string,
      value: q.name,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

type Props = {
  deletableChips?: boolean;
  label?: string;
  multiple?: boolean;
  operationState?: OperationState;
};

const props = withDefaults(defineProps<Props>(), {
  deletableChips: false,
  label: "Data sources",
  multiple: false,
  operationState: OperationState.Idle,
});

const selected = defineModel();

const busy = computed(() => props.operationState === OperationState.Busy);
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
