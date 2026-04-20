// js/ui.output.js - BlinkAI v3 output panel (chat window)

import { state }        from "./state.js";
import { MODELS, SEND_ICON_SVG } from "./constants.js";
import { makeDraggable, clampEl } from "./utils.js";
import { doFollowUp }   from "./request.js";

/**
 * Creates and mounts the output panel if it doesn't already exist.
 * The panel is draggable by its header and stays within the viewport.
 */
export function ensureOutputPanel() {
  if (state.outputPanel) return;

  const px = Math.max(10, Math.min(window.innerWidth  - 420, window.innerWidth  * 0.56));
  const py = Math.max(10, Math.min(window.innerHeight - 400, window.innerHeight * 0.1));

  state.outputPanel = document.createElement("div");
  state.outputPanel.id         = "bk-output";
  state.outputPanel.style.left = px + "px";
  state.outputPanel.style.top  = py + "px";

  // ── Header ──────────────────────────────────────────────────────────────
  const header = document.createElement("div");
  header.id = "bk-out-header";
  makeDraggable(state.outputPanel, header);

  const logo = document.createElement("div");
  logo.id          = "bk-out-logo";
  logo.textContent = "⚡";

  const title = document.createElement("div");
  title.id          = "bk-out-title";
  title.textContent = "BlinkAI";

  const modelTag = document.createElement("div");
  modelTag.id          = "bk-out-model-tag";
  modelTag.textContent = MODELS[state.activeModelIdx].label;

  const closeBtn = document.createElement("button");
  closeBtn.id        = "bk-out-close";
  closeBtn.innerHTML = "✕";
  closeBtn.title     = "Close";
  closeBtn.addEventListener("click", destroyOutput);

  header.appendChild(logo);
  header.appendChild(title);
  header.appendChild(modelTag);
  header.appendChild(closeBtn);

  // ── Body ─────────────────────────────────────────────────────────────────
  state.outputBody    = document.createElement("div");
  state.outputBody.id = "bk-out-body";

  // ── Footer / chat input ──────────────────────────────────────────────────
  const footer = document.createElement("div");
  footer.id = "bk-footer";

  const chatInput = document.createElement("textarea");
  chatInput.id          = "bk-chat-input";
  chatInput.placeholder = "Continue the conversation…";
  chatInput.rows        = 1;
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + "px";
  });

  const sendBtn = document.createElement("button");
  sendBtn.id        = "bk-send-btn";
  sendBtn.title     = "Send";
  sendBtn.innerHTML = SEND_ICON_SVG;

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doFollowUp(chatInput, sendBtn);
    }
  });
  sendBtn.addEventListener("click", () => doFollowUp(chatInput, sendBtn));

  footer.appendChild(chatInput);
  footer.appendChild(sendBtn);

  // ── Assemble ─────────────────────────────────────────────────────────────
  state.outputPanel.appendChild(header);
  state.outputPanel.appendChild(state.outputBody);
  state.outputPanel.appendChild(footer);
  state.outputPanel.addEventListener("mousedown", (e) => e.stopPropagation());
  document.body.appendChild(state.outputPanel);
  clampEl(state.outputPanel);
}

/** Removes the output panel and resets conversation history. */
export function destroyOutput() {
  if (state.outputPanel) {
    state.outputPanel.remove();
    state.outputPanel = null;
    state.outputBody  = null;
  }
  state.conversationHistory = [];
}
