<template>
  <v-container fluid class="px-0 py-0">
    <v-row>
      <v-col :cols="showTagInput ? 6 : 12">
        <v-select
          v-model="aggregation"
          :items="items"
          :disabled="busy"
          item-text="title"
          item-value="value"
          label="Group metrics by"
          single-line
        />
      </v-col>
      <v-col v-if="showTagInput" cols="6">
        <v-select
          v-model="tagName"
          :items="tags"
          :disabled="busy"
          label="Tag name"
          persistent-hint
          single-line
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import type { GroupBy } from "@/model/query";

const supportedDimensions: { title: string; value: GroupBy }[] = [
  {
    title: "Group by workload",
    value: "workloadId",
  },
  {
    title: "Group by repository group",
    value: "repoGroup",
  },
  {
    title: "Group by repository name",
    value: "repoName",
  },
  {
    title: "Group by job group",
    value: "jobGroup",
  },
  {
    title: "Group by job name",
    value: "jobName",
  },
  {
    title: "Group by tag",
    value: "tag",
  },
];
</script>

<script lang="ts" setup>
import { OperationState } from "@/utils/ui";
import { computed, ref, watch } from "vue";
import { listAllTagKeys } from "@/utils/config";

type TProps = {
  operationState: OperationState;
  dimensions: GroupBy[];
  allowCustomTag?: boolean;
};

const props = withDefaults(defineProps<TProps>(), {
  operationState: () => OperationState.Idle,
  dimensions: () => supportedDimensions.map((d) => d.value),
  allowCustomTag: () => true,
});

const items = computed(() => {
  let wanted = props.dimensions;
  if (props.allowCustomTag) {
    wanted = [...wanted, "tag"];
  }
  return supportedDimensions.filter((d) => wanted.includes(d.value));
});

const tags = listAllTagKeys();

const aggregation = ref<GroupBy>("workloadId");
const tagName = ref<string>("");

const showTagInput = computed(() => {
  return aggregation.value === "tag";
});

const model = defineModel<string>({ required: true });

watch(aggregation, () => updateModel());
watch(tagName, () => updateModel());

const updateModel = () => {
  model.value = showTagInput.value ? tagName.value : aggregation.value;
};

const busy = computed(() => {
  return props.operationState === OperationState.Busy;
});
</script>
