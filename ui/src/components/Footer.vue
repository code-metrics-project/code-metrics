<template>
  <div>
    <v-footer padless>
      <v-col class="text-center text-sm-body-2" cols="12">
        <div class="text--secondary">Code Metrics version {{ version }}</div>
        <div>
          &copy; {{ new Date().getFullYear() }} —
          <strong>Deloitte Digital</strong>
        </div>
      </v-col>
    </v-footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { getBootstrap } from "@/utils/config";

export default defineComponent({
  setup() {
    const appVersion = getBootstrap().apiVersion;
    return {
      version: appVersion,
    };
  },
});
</script>
