<template>
  <v-dialog v-model="active" max-width="400" persistent>
    <v-card :subtitle="dialog?.subtitle" :text="dialog?.text" :title="dialog?.title">
      <template v-slot:actions>
        <v-spacer />
        <v-btn v-if="dialog?.showCancel" @click="cancel"> {{ dialog?.cancelTitle }}</v-btn>
        <v-btn name="confirm" @click="confirm">
          {{ dialog?.confirmTitle }}
        </v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from "vue";
import { type DialogItem, useDialogStore } from "@/store/dialog";

const dialog = ref<DialogItem>();
const active = ref(false);

const dialogStore = useDialogStore();

const checkNextDialog = () => {
  const nextDialog = dialogStore.dialogs.pop();
  if (nextDialog) {
    dialog.value = nextDialog;
    active.value = true;
  }
};

const dismiss = (result: boolean) => {
  const onDone = () => {
    active.value = false;
    checkNextDialog();
  };
  const onDismiss = dialog.value?.onDismiss;
  if (onDismiss) {
    // don't dismiss the dialog until the promise resolves
    onDismiss(result)
      .catch((e) => console.error("An error occurred when dismissing the dialog", e))
      .finally(onDone);
  } else {
    onDone();
  }
};

const cancel = () => dismiss(false);
const confirm = () => dismiss(true);

const subscription = ref<() => void>();
onMounted(() => {
  subscription.value = dialogStore.$subscribe(() => {
    checkNextDialog();
  });
});

onUnmounted(() => {
  subscription.value?.();
});
</script>
