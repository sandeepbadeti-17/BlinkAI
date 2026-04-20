// js/ui.toolbar.js - BlinkAI v3 toolbar (selection popup)

import { state }                    from "./state.js";
import { MODELS, PRESETS, SEND_ICON_SVG } from "./constants.js";
import { clampEl, injectStyles }    from "./utils.js";
import { doRequest }                from "./request.js";

/**
 * Renders and mounts the floating toolbar at the given viewport coordinates.
 * Replaces any existing toolbar.
 */
export function showToolbar(x, y) {
  removeToolbar();
  injectStyles();

  state.toolbar          = document.createElement("div");
  state.toolbar.id       = "bk-toolbar";
  state.toolbar.style.left = x + "px";
  state.toolbar.style.top  = y + "px";

  state.toolbar.appendChild(buildBadge());
  state.toolbar.appendChild(buildInputRow());
  state.toolbar.appendChild(buildBottomBar());

  state.toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
  document.body.appendChild(state.toolbar);
  clampEl(state.toolbar);

  requestAnimationFrame(() => {
    const input = state.toolbar.querySelector("#bk-prompt-input");
    if (input) input.focus();
  });
}

/** Removes the toolbar from the DOM. */
export function removeToolbar() {
  if (state.toolbar) { state.toolbar.remove(); state.toolbar = null; }
}

// ── Internal builders ──────────────────────────────────────────────────────

function buildBadge() {
  const badge = document.createElement("div");
  badge.id        = "bk-badge";
  badge.innerHTML = `<span id="bk-badge-icon">⚡</span>Blink`;

  let presetMenu = null;

  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    if (presetMenu) { presetMenu.remove(); presetMenu = null; return; }
    presetMenu = buildPresetMenu(() => { presetMenu = null; });
    state.toolbar.appendChild(presetMenu);
  });

  return badge;
}

function buildPresetMenu(onClose) {
  const menu = document.createElement("div");
  menu.id = "bk-preset-menu";

  PRESETS.forEach((p) => {
    const item = document.createElement("div");
    item.className = "bk-preset-item";
    item.innerHTML = `<span class="bk-preset-icon">${p.icon}</span>${p.label}`;
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.remove();
      onClose();
      doRequest(null, p.prefix);
    });
    menu.appendChild(item);
  });

  return menu;
}

function buildInputRow() {
  const row = document.createElement("div");
  row.id = "bk-input-row";

  const promptInput = document.createElement("textarea");
  promptInput.id          = "bk-prompt-input";
  promptInput.placeholder = "Ask anything about the selection…";
  promptInput.rows        = 1;

  const sendBtn = document.createElement("button");
  sendBtn.id        = "bk-toolbar-send";
  sendBtn.title     = "Send";
  sendBtn.innerHTML = SEND_ICON_SVG;

  promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + "px";
    sendBtn.classList.toggle("active", promptInput.value.trim().length > 0);
  });

  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doRequest(promptInput.value.trim() || null, null);
    }
  });

  sendBtn.addEventListener("click", () => doRequest(promptInput.value.trim() || null, null));

  row.appendChild(promptInput);
  row.appendChild(sendBtn);
  return row;
}

function buildBottomBar() {
  const bar = document.createElement("div");
  bar.id = "bk-bottom-bar";

  // Quick-action preset buttons (first 3 presets)
  const quickActions = document.createElement("div");
  quickActions.id = "bk-quick-actions";
  PRESETS.slice(0, 3).forEach((p) => {
    const btn = document.createElement("button");
    btn.className  = "bk-quick-btn";
    btn.textContent = p.label;
    btn.addEventListener("click", () => doRequest(null, p.prefix));
    quickActions.appendChild(btn);
  });

  bar.appendChild(quickActions);
  bar.appendChild(buildModelPill());
  return bar;
}

function buildModelPill() {
  let modelMenuEl = null;

  const pill = document.createElement("div");
  pill.id        = "bk-model-pill";
  pill.innerHTML = `
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <circle cx="4" cy="4" r="3" stroke="rgba(255,195,40,0.5)" stroke-width="1"/>
      <circle cx="4" cy="4" r="1.2" fill="rgba(255,195,40,0.5)"/>
    </svg>
    <span id="bk-model-label">${MODELS[state.activeModelIdx].label}</span>
    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
      <path d="M1 1L3.5 3.5L6 1" stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-linecap="round"/>
    </svg>`;

  pill.addEventListener("click", (e) => {
    e.stopPropagation();
    if (modelMenuEl) { modelMenuEl.remove(); modelMenuEl = null; return; }
    modelMenuEl = buildModelMenu(() => { modelMenuEl = null; });
    state.toolbar.appendChild(modelMenuEl);
  });

  return pill;
}

function buildModelMenu(onClose) {
  const menu = document.createElement("div");
  menu.id = "bk-model-menu";

  MODELS.forEach((m, i) => {
    const item = document.createElement("div");
    item.className = "bk-model-item" + (i === state.activeModelIdx ? " active" : "");
    item.innerHTML = m.label + (i === state.activeModelIdx
      ? '<span class="bk-model-check">✓</span>' : "");

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      state.activeModelIdx = i;
      const lbl = document.querySelector("#bk-model-label");
      if (lbl) lbl.textContent = MODELS[i].label;
      const tag = document.querySelector("#bk-out-model-tag");
      if (tag) tag.textContent = MODELS[i].label;
      menu.remove();
      onClose();
    });

    menu.appendChild(item);
  });

  return menu;
}
