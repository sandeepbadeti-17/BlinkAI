// build.js - BlinkAI build script (cross-platform, no extra deps)
const { execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist");

// 1. Make sure dist/ exists
fs.mkdirSync(DIST, { recursive: true });
fs.mkdirSync(path.join(DIST, "css"), { recursive: true });

// 2. Bundle content.js (all js/ modules → single IIFE)
console.log("⚙️  Bundling content.js...");
execSync(
  "npx esbuild content.js --bundle --outfile=dist/content.js --platform=browser --target=chrome110 --format=iife",
  { stdio: "inherit" }
);

// 3. Copy background.js
fs.copyFileSync("background.js", path.join(DIST, "background.js"));
console.log("📄 Copied background.js");

// 4. Copy manifest.json
fs.copyFileSync("manifest.json", path.join(DIST, "manifest.json"));
console.log("📄 Copied manifest.json");

// 5. Copy css/blinkai.css
fs.copyFileSync(
  path.join("css", "blinkai.css"),
  path.join(DIST, "css", "blinkai.css")
);
console.log("🎨 Copied css/blinkai.css");

console.log("\n✅ Build complete! Load the  dist/  folder as an unpacked extension in Chrome.");
