import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Caminhos relativos permitem publicar em qualquer repositório do GitHub Pages.
  base: "./",
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), react()],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
  },
});
