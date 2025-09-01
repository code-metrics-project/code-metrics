<template>
  <v-container fill-height class="d-flex align-center justify-center">
    <v-card width="400">
      <v-card-title class="headline"
        ><v-icon color="primary">mdi-card-account-details-outline</v-icon> License error</v-card-title
      >
      <v-card-text>Your CodeMetrics license is missing or expired. Please add a license and retry.</v-card-text>
      <v-card-actions>
        <v-btn color="primary" type="button" @click.prevent="retry"> Retry </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script lang="ts" setup>
function retry() {
  window.location.href = window.location.origin;
}
</script>
