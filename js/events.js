// js/events.js - BlinkAI v3 DOM event listeners

import { state }         from "./state.js";
import { countWords }    from "./utils.js";
import { showToolbar, removeToolbar } from "./ui.toolbar.js";

/** Wires up all document-level events for toolbar show/hide lifecycle. */
export function registerEvents() {

  // Show toolbar on text selection; dismiss on empty/oversized selection
  document.addEventListener("mouseup", (e) => {
    const inToolbar = state.toolbar     && state.toolbar.contains(e.target);
    const inPanel   = state.outputPanel && state.outputPanel.contains(e.target);
    if (inToolbar || inPanel) return;

    const sel = window.getSelection().toString().trim();
    const wc  = countWords(sel);

    if (sel && wc >= 1 && wc <= 500) {
      state.currentSelection = sel;
      showToolbar(e.clientX + 12, e.clientY + 14);
    } else {
      removeToolbar();
      state.currentSelection = null;
    }
  });

  // Dismiss toolbar on click outside
  document.addEventListener("mousedown", (e) => {
    if (state.toolbar && !state.toolbar.contains(e.target)) removeToolbar();
  });

  // Dismiss toolbar on scroll (debounced)
  let scrollTimer;
  document.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => removeToolbar(), 80);
  }, { passive: true });

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    if (state.toolbar)     state.toolbar.remove();
    if (state.outputPanel) state.outputPanel.remove();
  });
}
