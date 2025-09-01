import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import istanbul from "vite-plugin-istanbul";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

const isProdBuild = process.env.NODE_ENV === "production";

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
  plugins: [
    vue(),
    ...(isProdBuild
      ? [
          vuetify({
            styles: {
              configFile: "src/assets/css/vuetify-overrides.scss",
            },
          }),
        ]
      : []),
    istanbul({
      include: "src/*",
      exclude: ["node_modules", "__tests__/"],
      extension: [".js", ".ts", ".vue"],
      requireEnv: false,
    }),
    // Added for fs and path polyfills
    nodePolyfills({
      protocolImports: true,
    }),
  ],
  server: {
    host: "code-metrics.localhost",
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
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
    coverage: {
      provider: "v8",
      reporter: ["json", "html", "lcov", "text"],
      reportsDirectory: "../coverage-ui--unit",
    },
  },
});
