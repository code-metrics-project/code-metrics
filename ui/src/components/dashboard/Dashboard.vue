<template>
  <v-row>
    <v-col
      v-for="item in props.dashboard.data"
      :key="item.id"
      cols="12"
      :md="item.presentationOptions?.width"
    >
      <Card
        :data-source="item.dataSource"
        :data-view="item.dataView"
        :presentation-options="item.presentationOptions"
      />
    </v-col>
  </v-row>
</template>

<script lang="ts" setup>
import Card from "./Card.vue";
import { type TDashboard } from "@/queries/dashboards";

type Props = {
  dashboard: TDashboard;
};

const props = defineProps<Props>();
</script>
