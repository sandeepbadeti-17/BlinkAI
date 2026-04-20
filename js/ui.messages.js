// js/ui.messages.js - BlinkAI v3 message rendering

import { state }  from "./state.js";
import { MODELS } from "./constants.js";

/**
 * Appends a chat bubble (user or AI) to the output body.
 * Optionally adds a "switch model" hint for error responses.
 */
export function addMessage(role, text, isError = false) {
  const wrap = document.createElement("div");
  wrap.className = "bk-msg bk-" + role;

  const label = document.createElement("div");
  label.className  = "bk-msg-label";
  label.textContent = role === "user" ? "You" : "BlinkAI";

  const bubble = document.createElement("div");
  bubble.className  = "bk-bubble" + (isError ? " bk-error" : "");
  bubble.textContent = text;

  if (isError) {
    const hint = document.createElement("span");
    hint.className  = "bk-switch-hint";
    hint.textContent = "Switch model and retry ↗";
    hint.addEventListener("click", () => {
      state.activeModelIdx = (state.activeModelIdx + 1) % MODELS.length;
      const lbl = document.querySelector("#bk-model-label");
      if (lbl) lbl.textContent = MODELS[state.activeModelIdx].label;
      const tag = document.querySelector("#bk-out-model-tag");
      if (tag) tag.textContent = MODELS[state.activeModelIdx].label;
    });
    bubble.appendChild(document.createElement("br"));
    bubble.appendChild(hint);
  }

  wrap.appendChild(label);
  wrap.appendChild(bubble);
  state.outputBody.appendChild(wrap);
  state.outputBody.scrollTop = state.outputBody.scrollHeight;
}

/** Shows the three-dot animated "thinking" indicator. */
export function showThinking() {
  const t = document.createElement("div");
  t.className = "bk-thinking";
  t.id        = "bk-thinking";
  for (let i = 0; i < 3; i++) {
    const d = document.createElement("div");
    d.className = "bk-dot";
    t.appendChild(d);
  }
  state.outputBody.appendChild(t);
  state.outputBody.scrollTop = state.outputBody.scrollHeight;
}

/** Removes the "thinking" indicator if present. */
export function hideThinking() {
  const t = document.querySelector("#bk-thinking");
  if (t) t.remove();
}
