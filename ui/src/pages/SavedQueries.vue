<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <v-breadcrumbs :items="items"></v-breadcrumbs>
          <h2 class="text-h2">Saved Queries</h2>
          <p>Managed saved queries and metrics.</p>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
  <v-container>
    <v-row>
      <v-col>
        <v-btn color="primary" :to="Paths.NewQuery">New query</v-btn>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-data-table
          :headers="headers"
          :items="collections"
          item-key="collection"
          :sort-by="[{ key: 'collection', order: 'asc' }]"
          :sort-desc="[true]"
          :items-per-page="10"
        >
          <template v-slot:item="{ item }">
            <tr>
              <td>
                <router-link :to="`${Paths.SavedQueries}/${item.id}`"
                  >{{ item.title }}
                </router-link>
              </td>
              <td class="justify-end d-flex">
                <v-tooltip text="Delete query">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="grey-darken-1"
                      class="ml-2"
                      icon="mdi-delete-forever"
                      variant="text"
                      @click.prevent="deleteQuery(item)"
                    />
                  </template>
                </v-tooltip>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
// @ts-nocheck
import { onMounted, ref } from "vue";
import { deleteQueryCollection, listQueryCollections } from "@/queries/stored";
import type { StoredQueryCollectionMeta } from "@/model/query";
import { Paths } from "@/router/paths";
import { useDialogStore } from "@/store/dialog";
import { useToastStore } from "@/store/toast";

const items = [
  {
    title: "Explore",
    to: Paths.Explore,
  },
  {
    title: "Saved Queries",
    to: Paths.SavedQueries,
  },
];

const headers = [
  {
    title: "Collection",
    align: "start",
    sortable: true,
    key: "title",
  },
  {
    title: "Actions",
    align: "end",
    sortable: false,
    key: "actions",
  },
];
const collections = ref<{ id: string; title: string }[]>();

const dialogStore = useDialogStore();
const toastStore = useToastStore();

const listQueries = async () => {
  collections.value = (await listQueryCollections()).map((collection) => ({
    id: collection.id,
    title: collection.title,
  }));
};

onMounted(async () => {
  await listQueries();
});

const deleteQuery = (collection: StoredQueryCollectionMeta) => {
  dialogStore.push({
    title: "Delete query",
    subtitle: "Are you sure you want to delete this query collection?",
    confirmTitle: "Delete",
    onDismiss: (confirm) => onDismissDeleteDialog(collection, confirm),
  });
};

const onDismissDeleteDialog = async (
  collection: StoredQueryCollectionMeta,
  confirm: boolean,
) => {
  if (!confirm) {
    return;
  }
  if (!collection?.id) {
    return;
  }

  await deleteQueryCollection(collection.id);
  toastStore.push({
    text: "Query collection deleted.",
  });
  await listQueries();
};
</script>
