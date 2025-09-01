<template>
  <v-menu v-model="addMenuOpen">
    <template v-slot:activator="{ props }">
      <v-btn color="accent" class="mb-3" v-bind="props" :disabled="busy"
        >Add tag
        <v-icon>mdi-menu-down</v-icon>
      </v-btn>
    </template>

    <v-list>
      <v-list-item v-for="tag in options" :key="tag" @click="addTag(tag)">
        <v-list-item-title>{{ tag }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>

  <div class="d-flex" v-for="({ key }, index) in tags" :key="index">
    <v-select
      :items="allTagPairs[key]"
      v-model="tags[index].value"
      @update:model-value="onModelUpdated"
      :disabled="busy"
      :label="key"
      :placeholder="key"
      hide-details
    />
    <v-btn class="ml-1 pt-2" @click="deleteTag(index)" :disabled="busy" icon="mdi-delete-forever" variant="flat" />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { OperationState } from "@/utils/ui";
import { getDefaultValue, InputType } from "@/queries/inputs";
import type { CommonInputProps } from "@/components/inputs/CommonInputProps";
import { getConfig } from "@/utils/config";

type TProps = CommonInputProps<{ key: string; value: string }[]> & {
  operationState?: OperationState;
};

const props = withDefaults(defineProps<TProps>(), {
  defaults: () => getDefaultValue<{ key: string; value: string }[]>(InputType.TAGS),

  operationState: OperationState.Idle,
});
const emit = defineEmits(["input"]);
const tags = ref(props.defaults);
const addMenuOpen = ref(false);

const allTagPairs = getConfig().systemConfig.tags;
const options = Object.keys(allTagPairs);

const onModelUpdated = () => {
  emit("input", tags.value);
};

const addTag = (key: string) => {
  tags.value.push({ key, value: "" });
  onModelUpdated();
};

const deleteTag = (index: number) => {
  tags.value.splice(index, 1);
  onModelUpdated();
};

const busy = computed(() => {
  return props.operationState === OperationState.Busy;
});
</script>
