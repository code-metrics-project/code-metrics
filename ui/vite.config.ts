import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import istanbul from "vite-plugin-istanbul";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

const isProdBuild = process.env.NODE_ENV === "production";
const isTest = process.env.VITEST === "true";
const enableCoverage = process.env.COVERAGE_ENABLED === "true";

const viteHost = process.env.VITE_HOST || "code-metrics.localhost";
const apiTarget = process.env.API_TARGET || "http://localhost:3000";

const plugins = [vue()];

if (isProdBuild || isTest) {
  plugins.push(
    ...vuetify({
      styles: {
        configFile: "src/assets/css/vuetify-overrides.scss",
      },
    }),
  );
}

if (enableCoverage) {
  plugins.push(
    istanbul({
      include: "src/*",
      exclude: ["node_modules", "__tests__/"],
      extension: [".js", ".ts", ".vue"],
      requireEnv: false,
    }),
  );
}

// Added for fs and path polyfills
plugins.push(
  nodePolyfills({
    protocolImports: true,
  }),
);

// https://vitejs.dev/config/
export default defineConfig({
  /**
   * The base path *must* be set to the root path ("/") for the application to work correctly
   * when the UI is served as a single page app that has sub-paths.
   *
   * For example, the UI has a sub-path like /workloads/... which means that the base path must
   * be set to "/" so that the application can resolve its assets (like CSS and JS files) correctly.
   */
  base: "/",
  build: {
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ["vue-i18n"],
  },
  plugins,
  server: {
    host: viteHost,
    port: 3001,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [fileURLToPath(new URL("./src/test/setup.ts", import.meta.url))],
    server: {
      deps: {
        inline: ["vuetify", "@mdi/font"],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["json", "html", "lcov", "text"],
      reportsDirectory: "../coverage-ui--unit",
    },
  },
});
