import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";

function copyStaticFiles() {
  return {
    name: "copy-static",
    closeBundle() {
      fs.copyFileSync(
        resolve(__dirname, "public/manifest.json"),
        resolve(__dirname, "dist/manifest.json")
      );
      fs.copyFileSync(
        resolve(__dirname, "src/popup.html"),
        resolve(__dirname, "dist/popup.html")
      );
      fs.copyFileSync(
        resolve(__dirname, "src/popup.js"),
        resolve(__dirname, "dist/popup.js")
      );
      // Copy icons folder
      const iconsDir = resolve(__dirname, "public/icons");
      const distIconsDir = resolve(__dirname, "dist/icons");
      if (!fs.existsSync(distIconsDir)) fs.mkdirSync(distIconsDir, { recursive: true });
      for (const f of fs.readdirSync(iconsDir)) {
        fs.copyFileSync(resolve(iconsDir, f), resolve(distIconsDir, f));
      }
      console.log("📄 Copied manifest + popup + icons to dist/");
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
