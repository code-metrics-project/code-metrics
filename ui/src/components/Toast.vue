<template>
  <v-snackbar v-model="active" :timeout="toast?.timeout">
    {{ toast?.text }}

    <template v-slot:actions>
      <v-btn color="blue" variant="text" @click="dismiss"> Close </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { type ToastItem, useToastStore } from "@/store/toast";

const toast = ref<ToastItem>();
const active = ref(false);

const toastStore = useToastStore();

const checkNextToast = () => {
  console.log("checkNextToast");
  const nextToast = toastStore.toasts.pop();
  if (nextToast) {
    nextToast.timeout = nextToast.timeout ?? 2000;

    toast.value = nextToast;
    active.value = true;
  }
};

watch(
  () => active.value,
  (value: boolean) => {
    if (!value) {
      checkNextToast();
    }
  },
);

const dismiss = () => {
  active.value = false;
};

const subscription = ref<() => void>();
onMounted(() => {
  subscription.value = toastStore.$subscribe(() => {
    checkNextToast();
  });
});

onUnmounted(() => {
  subscription.value?.();
});
</script>
