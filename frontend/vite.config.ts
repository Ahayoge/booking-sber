// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Алиас @ → src/ : пишем import { X } from '@/api' вместо '../../api'
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Проксируем /api запросы на бэкенд — не нужен CORS в dev-режиме
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
