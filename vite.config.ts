import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "./",
  build:
    process.env.VITE_BUILD_TARGET === "plugin"
      ? {
          emptyOutDir: false,
          rollupOptions: {
            input: resolve(import.meta.dirname, "src/plugin.ts"),
            output: {
              assetFileNames: "assets/[name]-[hash][extname]",
              entryFileNames: "plugin.js",
              format: "iife",
            },
          },
        }
      : {
          emptyOutDir: false,
          rollupOptions: {
            input: resolve(import.meta.dirname, "index.html"),
            output: {
              assetFileNames: "assets/[name]-[hash][extname]",
              entryFileNames: "assets/[name]-[hash].js",
            },
          },
        },
  server: {
    cors: true,
    host: "0.0.0.0",
    port: 4173,
  },
  preview: {
    cors: true,
    host: "0.0.0.0",
    port: 4173,
  },
});
