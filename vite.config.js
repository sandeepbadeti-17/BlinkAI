import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";

function copyStaticFiles() {
  return {
    name: "copy-static",
    closeBundle() {
      // manifest.json
      fs.copyFileSync(
        resolve(__dirname, "public/manifest.json"),
        resolve(__dirname, "dist/manifest.json")
      );
      // popup files (vanilla JS, no bundling needed)
      fs.copyFileSync(
        resolve(__dirname, "src/popup.html"),
        resolve(__dirname, "dist/popup.html")
      );
      fs.copyFileSync(
        resolve(__dirname, "src/popup.js"),
        resolve(__dirname, "dist/popup.js")
      );
      console.log("📄 Copied manifest + popup files to dist/");
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStaticFiles()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content.jsx"),
        background: resolve(__dirname, "src/background.js"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
    cssCodeSplit: false,
    target: "chrome110",
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
