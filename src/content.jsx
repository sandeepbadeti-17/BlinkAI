// src/content.jsx
// This is the Chrome content script entry point.
// We mount React into a Shadow DOM to isolate styles from the host page.

import { createRoot } from "react-dom/client";
import App from "./App";
import styles from "./styles/blinkai.css?inline";

(function initBlinkAI() {
  console.log("✅ BlinkAI content script loaded");

  // Verify background is ready
  chrome.runtime.sendMessage({ greeting: "hello" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("❌ Background:", chrome.runtime.lastError);
    } else {
      console.log("✅ Background ready:", response);
    }
  });

  // Create a host element
  const host = document.createElement("div");
  host.id = "blinkai-root";
  host.style.cssText = "all: initial; position: fixed; z-index: 2147483647; pointer-events: none;";
  document.body.appendChild(host);

  // Attach shadow root for style isolation
  const shadow = host.attachShadow({ mode: "open" });

  // Inject styles into Shadow DOM
  const styleEl = document.createElement("style");
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  // Mount React into shadow root
  const mountPoint = document.createElement("div");
  mountPoint.id = "blinkai-mount";
  mountPoint.style.cssText = "pointer-events: auto;";
  shadow.appendChild(mountPoint);

  const root = createRoot(mountPoint);
  root.render(<App />);

  console.log("✅ BlinkAI v2 ready — select text to start");
})();
