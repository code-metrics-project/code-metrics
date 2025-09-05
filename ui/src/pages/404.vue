<template>
  <v-sheet color="accent">
    <v-container>
      <v-row>
        <v-col class="pb-8">
          <h2 class="text-h2">404</h2>
          <h3 class="text-h3">Page not found</h3>
          <v-btn
            :to="{
              name: 'Home',
            }"
            class="mt-4"
            >Return home</v-btn
          >
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
</template>
