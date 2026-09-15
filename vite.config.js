import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The Base44 Vite plugin used to resolve this "@/" alias (matching
      // jsconfig.json's path mapping, used for editor/IDE support only).
      // Now that it's gone, Vite needs to be told about it explicitly.
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
