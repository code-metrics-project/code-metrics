import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import istanbul from "vite-plugin-istanbul";
import { defineConfig } from "vitest/config";

const enableCoverage = process.env.COVERAGE_ENABLED === "true";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(enableCoverage
      ? [
          istanbul({
            include: ["**/src/**"],
            exclude: ["node_modules", "__tests__/"],
            extension: [".js", ".ts", ".tsx", ".jsx"],
            requireEnv: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3001,
    host: "code-metrics.localhost",
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["json", "html", "lcov", "text"],
      reportsDirectory: "../coverage-frontend--unit",
    },
  },
});
