<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="py-8">
          <h2 class="text-h2 pb-4">Administration</h2>
          <p class="text-body-1 py-1">
            Manage your CodeMetrics instance settings and administrative tasks. This section provides tools for system
            administration, security management, and service configuration.
          </p>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>

  <v-container fill-height class="d-flex align-center justify-center">
    <v-row>
      <v-col cols="12" sm="4">
        <v-card title="Service Tokens" class="d-flex flex-column fill-height">
          <template v-slot:prepend>
            <v-icon color="primary" icon="mdi-key-variant"></v-icon>
          </template>
          <v-card-item>Issue, revoke and manage service tokens for access to the API.</v-card-item>
          <v-divider />
          <v-card-actions>
            <v-btn color="primary" plain :to="Paths.AdminTokens">Manage Service Tokens</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { Paths } from "@/router/paths";
</script>
