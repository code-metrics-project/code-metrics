<template>
  <slot v-if="featureEnabled" />
</template>
<script lang="ts" setup>
import { type FeatureKey, listActiveFeatures } from "@/utils/features";

const props = defineProps<{ feature: FeatureKey }>();
const featureEnabled = listActiveFeatures()[props.feature];
</script>
