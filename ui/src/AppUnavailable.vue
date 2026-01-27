<template>
  <v-app>
    <v-main>
      <v-alert
        color="error"
        icon="$error"
        title="Couldn't reach the CodeMetrics API to fetch basic configuration."
        text="Please check the API is running and that the connection details are correct, then refresh the page."
      />
    </v-main>
  </v-app>
</template>
