<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <span>{{ presentationOptions?.title }}</span>
      <v-spacer />
      <p v-if="!isPending && isFetching">
        <v-progress-circular indeterminate color="blue-grey" size="20" />
      </p>
    </v-card-title>

    <v-card-text>
      <div v-if="isPending">
        <v-skeleton-loader class="mx-auto" type="card" />
      </div>

      <p v-if="isError">Error fetching data.</p>

      <Component v-if="data" :is="dataRenderers[props.dataView.name]" :data="data" :options="props.dataView.props" />
    </v-card-text>
  </v-card>
</template>

<script lang="ts" setup>
import { dataSources, type TDataSourceType } from "@/components/dashboard/dataSources";
import { dataRenderers, type TDataRendererType } from "@/components/dashboard/dataRenderers";

export type TDashboardCard = {
  dataSource: TDataSourceType;
  dataView: TDataRendererType;
  presentationOptions?: {
    title?: string;
    width?: number;
  };
};

const props = defineProps<TDashboardCard>();

const { data, isError, isFetching, isPending } = dataSources[props.dataSource.name](props.dataSource.args);
</script>
