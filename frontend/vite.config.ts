import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/cleverschool-api": {
        target: "https://api.cleverschool.cn",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cleverschool-api/, ""),
      },
      "/haier-api": {
        target: "https://yshz-user.haier-ioc.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/haier-api/, ""),
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
