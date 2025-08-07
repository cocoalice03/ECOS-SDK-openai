import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./client/src', import.meta.url)),
    },
  },
  root: "./client",
  server: {
    host: "0.0.0.0",
    port: 5173,
    hmr: {
      overlay: false
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../dist",
    rollupOptions: {
      external: [],
    },
  },
  optimizeDeps: {
    exclude: ['@replit/vite-plugin-runtime-error-modal']
  }
});