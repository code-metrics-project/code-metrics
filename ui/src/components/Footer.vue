<template>
  <div>
    <v-footer padless>
      <v-col class="text-center text-sm-body-2" cols="12">
        <div class="text--secondary">
          CodeMetrics <span class="footer-classic-pill">Classic UI</span> version {{ version }}
        </div>
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

<style scoped>
.footer-classic-pill {
  display: inline-flex;
  align-items: center;
  margin: 0 4px;
  padding: 1px 8px;
  border: 1px solid currentColor;
  border-radius: 999px;
  line-height: 1.2;
  font-style: italic;
}
</style>
