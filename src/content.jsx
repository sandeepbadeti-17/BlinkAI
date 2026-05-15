// src/content.jsx — Chrome content script
// Mounts React into a Shadow DOM for style isolation.
// Designed to be idempotent — safe to call multiple times (PDF re-injection).

import { createRoot } from "react-dom/client";
import App from "./App";
import styles from "./styles/blinkai.css?inline";

(function initBlinkAI() {
  // Idempotency guard — background may inject us a second time on PDF tabs
  if (document.getElementById("blinkai-root")) return;

  chrome.runtime.sendMessage({ greeting: "hello" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("❌ BlinkAI background:", chrome.runtime.lastError);
    }
  });

  function mount() {
    if (document.getElementById("blinkai-root")) return;

    const target = document.body || document.documentElement;
    if (!target) return;

    const host = document.createElement("div");
    host.id = "blinkai-root";
    host.style.cssText =
      "all:initial;position:fixed;z-index:2147483647;pointer-events:none;";
    target.appendChild(host);

    const shadow  = host.attachShadow({ mode: "open" });
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    shadow.appendChild(styleEl);

    const mountPoint = document.createElement("div");
    mountPoint.id = "blinkai-mount";
    mountPoint.style.cssText = "pointer-events:auto;";
    shadow.appendChild(mountPoint);

    createRoot(mountPoint).render(<App />);
    console.log("✅ BlinkAI ready");
  }

  // Mount immediately if body exists, otherwise wait for DOM
  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  }
})();
