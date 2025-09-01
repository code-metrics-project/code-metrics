<template>
  <v-alert v-if="!!alert" :type="alert.type">{{ alert.message }}</v-alert>
</template>

<script lang="ts" setup>
import type { Alert } from "@/utils/ui";

defineProps<{
  alert: Alert | null;
}>();
</script>
