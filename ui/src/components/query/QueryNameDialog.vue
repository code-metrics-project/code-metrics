<template>
  <v-dialog v-model="dialog" max-width="400" persistent>
    <v-card subtitle="Enter a name for this collection of queries" title="Save query">
      <template v-slot:text>
        <v-text-field name="queryName" v-model="collectionTitle" label="Collection name" outlined required />
      </template>
      <template v-slot:actions>
        <v-spacer />
        <v-btn @click="cancel"> Cancel</v-btn>
        <v-btn name="setQueryName" @click="saveName"> Save</v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import type { StoredQueryCollection } from "@/model/query";
import { ref, watch } from "vue";
import { OperationState } from "@/utils/ui";
import { saveQueryCollection } from "@/queries/stored";

type Props = {
  collection?: StoredQueryCollection;
  active: boolean;
};

const props = defineProps<Props>();
const emit = defineEmits(["dismissed", "operationStateChanged"]);
const dialog = ref(props.active);

watch(
  () => props.active,
  (active) => {
    dialog.value = active;
  },
);
const collectionTitle = ref("");

const cancel = () => emit("dismissed");

/**
 * Normalise collectionName to only have alphanumeric characters and hyphens.
 */
const generateIdFromTitle = (title: string) => {
  const id = title
    .toLowerCase()
    .replace(/\s/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  console.debug("Normalised collection name to", id);
  return id;
};

const saveName = async () => {
  try {
    if (!collectionTitle.value || collectionTitle.value.trim().length === 0) {
      return;
    }

    const collectionId = generateIdFromTitle(collectionTitle.value);

    const collection = props.collection!;
    collection.id = collectionId;
    collection.title = collectionTitle.value;

    emit("operationStateChanged", OperationState.Busy);
    await saveQueryCollection(collection);
    emit("operationStateChanged", OperationState.Idle);
    emit("dismissed", collection);
  } catch (e) {
    console.error("Failed to save collection", e);
    emit("operationStateChanged", OperationState.Error);
  }
};
</script>
