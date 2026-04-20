/**
 * vite.config.js
 * --------------
 * Vite build configuration for the Dexaview frontend.
 *
 * Notable settings:
 *  - optimizeDeps.exclude: Rapier's WASM binary must not be pre-bundled by
 *    Vite; it loads itself asynchronously at runtime.
 *  - assetsInlineLimit: set to 0 to prevent Vite from inlining the Draco
 *    WASM decoder files as base64 strings (they are too large for inlining).
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "three/addons": path.resolve(__dirname, "node_modules/three/examples/jsm"),
      "three/webgpu": path.resolve(__dirname, "node_modules/three/build/three.webgpu.js"),
      "three": path.resolve(__dirname, "node_modules/three/build/three.webgpu.js"),
    },
  },

  optimizeDeps: {
    exclude: ["@dimforge/rapier3d-compat"],
  },

  build: {
    // Keep WASM and Draco files as separate assets (not inlined as base64)
    assetsInlineLimit: 0,

    rollupOptions: {
      output: {
        // Split vendor libraries into a separate chunk for better caching
        manualChunks: {
          three: ["three"],
          react: ["react", "react-dom"],
        },
      },
    },
  },

  server: {
    port: 5173,
    // Proxy API requests to the backend during development
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
