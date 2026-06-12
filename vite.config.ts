import { defineConfig } from "vite";
import pkg from "./package.json";

export default defineConfig({
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          if (id.includes("node_modules/@solana")) return "solana";
          if (id.includes("node_modules/cannon-es")) return "cannon";
        },
      },
    },
  },
});
