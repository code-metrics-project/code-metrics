<template>
  <v-list-item v-if="showSave">
    <!-- <v-list-item-icon><v-icon>mdi-content-save</v-icon></v-list-item-icon> -->
    <!-- <v-list-item-title>Save query</v-list-item-title> -->
    <v-list-item-action :disabled="busy" @click.prevent="onSave">Save query </v-list-item-action>
  </v-list-item>
  <v-list-item v-if="showDelete">
    <!-- <v-list-item-icon><v-icon>mdi-delete-forever</v-icon></v-list-item-icon> -->
    <!-- <v-list-item-title>Delete query</v-list-item-title> -->
    <v-list-item-action :disabled="busy" @click.prevent="onDelete">Delete query </v-list-item-action>
  </v-list-item>
</template>

<script lang="ts" setup>
import { OperationState } from "@/utils/ui";
import type { StoredQueryCollection } from "@/model/query";
import { computed } from "vue";

type Props = {
  collection?: StoredQueryCollection;
  showDelete?: boolean;
  showSave?: boolean;
  operationState?: OperationState;
};

const props = defineProps<Props>();
const emit = defineEmits(["delete-query", "save-query", "operationStateChanged"]);

const busy = computed(() => props.operationState === OperationState.Busy);

const onSave = () => {
  const collection = props.collection;
  if (!collection) {
    return;
  }
  emit("save-query");
};

const onDelete = () => {
  const collection = props.collection;
  if (!collection) {
    return;
  }
  emit("delete-query");
};
</script>
