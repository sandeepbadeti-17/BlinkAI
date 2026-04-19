// content.js — BlinkAI v3
console.log("✅ BlinkAI content script loaded");

chrome.runtime.sendMessage({ greeting: "hello" }, (response) => {
  if (chrome.runtime.lastError) console.error("❌ Background:", chrome.runtime.lastError);
  else console.log("✅ Background ready:", response);
});

// ─── State ────────────────────────────────────────────────────────────────────
let toolbar      = null;
let outputPanel  = null;
let outputBody   = null;
let currentSelection  = null;
let isProcessing      = false;
let conversationHistory = [];

// ─── Models ───────────────────────────────────────────────────────────────────
const MODELS = [
  { id: "gemini-3-flash-preview",        label: "Gemini 3 Flash" },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite" },
];
let activeModelIdx = 0;

// ─── Predefined prompts ───────────────────────────────────────────────────────
const PRESETS = [
  { icon: "✦", label: "Summarize",    prefix: "Summarize this in 3 concise bullet points:\n\n" },
  { icon: "◈", label: "Explain",      prefix: "Explain this clearly as if I'm new to the topic:\n\n" },
  { icon: "◎", label: "Key points",   prefix: "Extract the 3 most important takeaways from this:\n\n" },
  { icon: "◇", label: "Simplify",     prefix: "Rewrite this in plain simple language:\n\n" },
  { icon: "⬡", label: "Action items", prefix: "List any action items or next steps from this:\n\n" },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.querySelector("#blinkai-styles")) return;
  const s = document.createElement("style");
  s.id = "blinkai-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

    @keyframes bkFadeUp {
      from { opacity:0; transform:translateY(6px) scale(0.98); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes bkDropIn {
      from { opacity:0; transform:translateY(-5px) scale(0.97); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes bkSlideIn {
      from { opacity:0; transform:translateX(14px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes bkPulse {
      0%,100% { opacity:1; } 50% { opacity:0.22; }
    }

    /* ══ TOOLBAR ══ */
    #bk-toolbar {
      position: fixed;
      z-index: 2147483640;
      background: #111111;
      border: 1px solid rgba(255,195,40,0.18);
      border-radius: 16px;
      width: 420px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03) inset;
      font-family: 'DM Sans', sans-serif;
      animation: bkFadeUp 0.18s cubic-bezier(.34,1.4,.64,1);
      padding: 24px 14px 8px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* Floating badge centered on top border */
    #bk-badge {
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #FFD700 0%, #FF9500 100%);
      color: #0d0d0d;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 14px 5px 10px;
      border-radius: 99px;
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      box-shadow: 0 3px 14px rgba(255,155,0,0.5);
      user-select: none;
      letter-spacing: 0.02em;
      white-space: nowrap;
      transition: filter 0.15s, box-shadow 0.15s;
      z-index: 1;
    }
    #bk-badge:hover { filter: brightness(1.1); box-shadow: 0 4px 18px rgba(255,155,0,0.65); }
    #bk-badge:active { filter: brightness(0.95); }
    #bk-badge-icon { font-size: 13px; }

    /* Preset dropdown */
    #bk-preset-menu {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%) translateY(-100%);
      background: #1a1a1a;
      border: 1px solid rgba(255,195,40,0.2);
      border-radius: 12px;
      padding: 5px 0;
      width: 200px;
      box-shadow: 0 10px 32px rgba(0,0,0,0.75);
      z-index: 2147483645;
      animation: bkDropIn 0.15s ease;
      overflow: hidden;
    }
    .bk-preset-item {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 14px;
      font-size: 12.5px;
      color: #c0c0c0;
      cursor: pointer;
      transition: background 0.11s, color 0.11s;
      font-family: 'DM Sans', sans-serif;
    }
    .bk-preset-item:hover { background: rgba(255,195,40,0.1); color: #FFD700; }
    .bk-preset-icon { width: 16px; text-align: center; flex-shrink: 0; color: rgba(255,195,40,0.55); font-size: 12px; }

    /* Input row — borderless */
    #bk-input-row {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      padding: 2px 2px 8px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    #bk-prompt-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f0f0f0;
      font-family: 'DM Sans', sans-serif;
      font-size: 13.5px;
      line-height: 1.52;
      padding: 3px 2px;
      resize: none;
      min-height: 26px;
      max-height: 120px;
      overflow-y: auto;
      scrollbar-width: none;
      caret-color: #FFD700;
    }
    #bk-prompt-input::-webkit-scrollbar { display: none; }
    #bk-prompt-input::placeholder { color: rgba(255,255,255,0.2); }

    #bk-toolbar-send {
      width: 28px; height: 28px;
      border-radius: 7px; border: none;
      background: linear-gradient(135deg, #FFD700, #FF9500);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-bottom: 1px;
      transition: all 0.14s;
      opacity: 0.35;
      pointer-events: none;
    }
    #bk-toolbar-send.active { opacity: 1; pointer-events: auto; }
    #bk-toolbar-send.active:hover  { filter: brightness(1.12); transform: scale(1.07); }
    #bk-toolbar-send.active:active { transform: scale(0.93); }

    /* Bottom bar */
    #bk-bottom-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 2px 2px;
    }
    #bk-quick-actions { display: flex; gap: 5px; }
    .bk-quick-btn {
      border: none;
      background: rgba(255,255,255,0.05);
      border-radius: 6px;
      color: rgba(255,255,255,0.38);
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 500;
      padding: 4px 9px;
      cursor: pointer;
      transition: all 0.12s;
    }
    .bk-quick-btn:hover  { background: rgba(255,195,40,0.11); color: #FFD700; }
    .bk-quick-btn:active { transform: scale(0.95); }

    /* Model pill */
    #bk-model-pill {
      display: flex; align-items: center; gap: 5px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 99px;
      padding: 3px 10px 3px 8px;
      cursor: pointer;
      font-family: 'DM Mono', monospace;
      font-size: 9.5px;
      color: rgba(255,255,255,0.3);
      transition: all 0.13s;
      user-select: none;
      white-space: nowrap;
    }
    #bk-model-pill:hover { border-color: rgba(255,195,40,0.3); color: rgba(255,195,40,0.65); }

    /* Model dropdown */
    #bk-model-menu {
      position: absolute;
      bottom: 42px; right: 14px;
      background: #1a1a1a;
      border: 1px solid rgba(255,195,40,0.2);
      border-radius: 11px;
      padding: 5px 0;
      width: 200px;
      box-shadow: 0 10px 32px rgba(0,0,0,0.75);
      z-index: 2147483646;
      animation: bkFadeUp 0.14s ease;
      overflow: hidden;
    }
    .bk-model-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 14px;
      font-family: 'DM Sans', sans-serif; font-size: 12.5px; color: #b0b0b0;
      cursor: pointer; transition: background 0.11s, color 0.11s;
    }
    .bk-model-item:hover  { background: rgba(255,195,40,0.09); color: #FFD700; }
    .bk-model-item.active { color: #FFD700; }
    .bk-model-check { font-size: 10px; color: #FFD700; }

    /* ══ OUTPUT PANEL ══ */
    #bk-output {
      position: fixed;
      z-index: 2147483641;
      width: 400px;
      max-height: 560px;
      min-height: 120px;
      background: #111111;
      border: 1px solid rgba(255,195,40,0.16);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 18px 54px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.03) inset;
      font-family: 'DM Sans', sans-serif;
      overflow: hidden;
      animation: bkSlideIn 0.22s ease;
    }
    #bk-out-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      cursor: grab; user-select: none; flex-shrink: 0;
      background: rgba(255,195,40,0.035);
    }
    #bk-out-header:active { cursor: grabbing; }
    #bk-out-logo { font-size: 13px; }
    #bk-out-title {
      flex: 1; font-size: 11px; font-weight: 600;
      color: rgba(255,195,40,0.65); letter-spacing: 0.08em; text-transform: uppercase;
    }
    #bk-out-model-tag {
      font-family: 'DM Mono', monospace; font-size: 9.5px;
      color: rgba(255,255,255,0.18); letter-spacing: 0.03em;
    }
    #bk-out-close {
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(255,255,255,0.06); border: none;
      color: rgba(255,255,255,0.3); font-size: 11px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.13s; flex-shrink: 0;
    }
    #bk-out-close:hover { background: rgba(255,65,65,0.22); color: #ff7070; }

    #bk-out-body {
      flex: 1; overflow-y: auto; padding: 13px 14px;
      display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    #bk-out-body::-webkit-scrollbar { width: 4px; }
    #bk-out-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.11); border-radius: 10px; }

    .bk-msg { display: flex; flex-direction: column; gap: 3px; animation: bkFadeUp 0.18s ease; }
    .bk-msg-label {
      font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    }
    .bk-msg.bk-user .bk-msg-label { color: rgba(255,195,40,0.42); }
    .bk-msg.bk-ai   .bk-msg-label { color: rgba(80,200,140,0.42); }
    .bk-bubble {
      font-size: 13.5px; line-height: 1.65; color: #e0e0e0;
      border-radius: 10px; padding: 9px 12px;
      white-space: pre-wrap; word-break: break-word;
    }
    .bk-msg.bk-user .bk-bubble {
      background: rgba(255,195,40,0.07); border: 1px solid rgba(255,195,40,0.11); color: #f0e4ae;
    }
    .bk-msg.bk-ai .bk-bubble {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
    }
    .bk-bubble.bk-error {
      background: rgba(255,55,55,0.07); border: 1px solid rgba(255,55,55,0.18); color: #ff9090;
    }
    .bk-switch-hint {
      display: inline-block; margin-top: 6px; font-size: 11px;
      color: rgba(255,195,40,0.6); cursor: pointer;
      text-decoration: underline; text-underline-offset: 2px;
    }
    .bk-switch-hint:hover { color: #FFD700; }

    .bk-thinking {
      display: flex; gap: 5px; align-items: center;
      padding: 9px 12px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
    }
    .bk-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: rgba(255,195,40,0.5);
      animation: bkPulse 1.2s ease infinite;
    }
    .bk-dot:nth-child(2) { animation-delay: 0.18s; }
    .bk-dot:nth-child(3) { animation-delay: 0.36s; }

    /* Footer — borderless input */
    #bk-footer {
      border-top: 1px solid rgba(255,255,255,0.06);
      padding: 8px 10px 9px;
      display: flex; gap: 6px; align-items: flex-end;
      flex-shrink: 0; background: rgba(0,0,0,0.14);
    }
    #bk-chat-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: #f0f0f0; font-family: 'DM Sans', sans-serif;
      font-size: 13px; padding: 3px 2px; resize: none;
      min-height: 26px; max-height: 100px; line-height: 1.5;
      overflow-y: auto; scrollbar-width: none; caret-color: #FFD700;
    }
    #bk-chat-input::-webkit-scrollbar { display: none; }
    #bk-chat-input::placeholder { color: rgba(255,255,255,0.2); }

    #bk-send-btn {
      width: 28px; height: 28px; border-radius: 7px; border: none;
      background: linear-gradient(135deg, #FFD700, #FF9500);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-bottom: 1px; transition: all 0.14s;
    }
    #bk-send-btn:hover  { filter: brightness(1.1); transform: scale(1.07); }
    #bk-send-btn:active { transform: scale(0.93); }
    #bk-send-btn.bk-busy { opacity: 0.35; pointer-events: none; }
  `;
  document.head.appendChild(s);
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────
function showToolbar(x, y) {
  removeToolbar();
  injectStyles();

  toolbar = document.createElement("div");
  toolbar.id = "bk-toolbar";
  toolbar.style.left = x + "px";
  toolbar.style.top  = y + "px";

  // ── Floating ⚡Blink badge ──
  const badge = document.createElement("div");
  badge.id = "bk-badge";
  badge.innerHTML = `<span id="bk-badge-icon">⚡</span>Blink`;

  let presetMenu = null;

  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    if (presetMenu) { presetMenu.remove(); presetMenu = null; return; }
    presetMenu = document.createElement("div");
    presetMenu.id = "bk-preset-menu";
    PRESETS.forEach((p) => {
      const item = document.createElement("div");
      item.className = "bk-preset-item";
      item.innerHTML = `<span class="bk-preset-icon">${p.icon}</span>${p.label}`;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        presetMenu.remove(); presetMenu = null;
        doRequest(null, p.prefix);
      });
      presetMenu.appendChild(item);
    });
    toolbar.appendChild(presetMenu);
  });

  toolbar.appendChild(badge);

  // ── Input row (borderless) ──
  const inputRow = document.createElement("div");
  inputRow.id = "bk-input-row";

  const promptInput = document.createElement("textarea");
  promptInput.id = "bk-prompt-input";
  promptInput.placeholder = "Ask anything about the selection…";
  promptInput.rows = 1;

  const sendBtn = document.createElement("button");
  sendBtn.id = "bk-toolbar-send";
  sendBtn.title = "Send";
  sendBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 13 13" fill="none">
    <path d="M1 6.5L12 1L7 12L5.5 7L1 6.5Z" fill="#0d0d0d" stroke="#0d0d0d" stroke-width="0.8" stroke-linejoin="round"/>
  </svg>`;

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

  inputRow.appendChild(promptInput);
  inputRow.appendChild(sendBtn);
  toolbar.appendChild(inputRow);

  // ── Bottom bar ──
  const bottomBar = document.createElement("div");
  bottomBar.id = "bk-bottom-bar";

  const quickActions = document.createElement("div");
  quickActions.id = "bk-quick-actions";
  PRESETS.slice(0, 3).forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "bk-quick-btn";
    btn.textContent = p.label;
    btn.addEventListener("click", () => doRequest(null, p.prefix));
    quickActions.appendChild(btn);
  });

  // Model pill + dropdown
  let modelMenuEl = null;
  const modelPill = document.createElement("div");
  modelPill.id = "bk-model-pill";
  modelPill.innerHTML = `
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <circle cx="4" cy="4" r="3" stroke="rgba(255,195,40,0.5)" stroke-width="1"/>
      <circle cx="4" cy="4" r="1.2" fill="rgba(255,195,40,0.5)"/>
    </svg>
    <span id="bk-model-label">${MODELS[activeModelIdx].label}</span>
    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
      <path d="M1 1L3.5 3.5L6 1" stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-linecap="round"/>
    </svg>
  `;
  modelPill.addEventListener("click", (e) => {
    e.stopPropagation();
    if (modelMenuEl) { modelMenuEl.remove(); modelMenuEl = null; return; }
    modelMenuEl = document.createElement("div");
    modelMenuEl.id = "bk-model-menu";
    MODELS.forEach((m, i) => {
      const item = document.createElement("div");
      item.className = "bk-model-item" + (i === activeModelIdx ? " active" : "");
      item.innerHTML = m.label + (i === activeModelIdx ? '<span class="bk-model-check">✓</span>' : "");
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        activeModelIdx = i;
        document.querySelector("#bk-model-label").textContent = MODELS[i].label;
        const tag = document.querySelector("#bk-out-model-tag");
        if (tag) tag.textContent = MODELS[i].label;
        modelMenuEl.remove(); modelMenuEl = null;
      });
      modelMenuEl.appendChild(item);
    });
    toolbar.appendChild(modelMenuEl);
  });

  bottomBar.appendChild(quickActions);
  bottomBar.appendChild(modelPill);
  toolbar.appendChild(bottomBar);

  toolbar.addEventListener("mousedown", (e) => e.stopPropagation());
  document.body.appendChild(toolbar);
  clampEl(toolbar);
  requestAnimationFrame(() => promptInput.focus());
}

function removeToolbar() {
  if (toolbar) { toolbar.remove(); toolbar = null; }
}

// ─── Output panel ─────────────────────────────────────────────────────────────
function ensureOutputPanel() {
  if (outputPanel) return;
  const px = Math.max(10, Math.min(window.innerWidth  - 420, window.innerWidth  * 0.56));
  const py = Math.max(10, Math.min(window.innerHeight - 400, window.innerHeight * 0.1));

  outputPanel = document.createElement("div");
  outputPanel.id = "bk-output";
  outputPanel.style.left = px + "px";
  outputPanel.style.top  = py + "px";

  const header = document.createElement("div");
  header.id = "bk-out-header";
  makeDraggable(outputPanel, header);

  const logo = document.createElement("div");
  logo.id = "bk-out-logo"; logo.textContent = "⚡";

  const title = document.createElement("div");
  title.id = "bk-out-title"; title.textContent = "BlinkAI";

  const modelTag = document.createElement("div");
  modelTag.id = "bk-out-model-tag"; modelTag.textContent = MODELS[activeModelIdx].label;

  const closeBtn = document.createElement("button");
  closeBtn.id = "bk-out-close"; closeBtn.innerHTML = "✕"; closeBtn.title = "Close";
  closeBtn.addEventListener("click", destroyOutput);

  header.appendChild(logo); header.appendChild(title);
  header.appendChild(modelTag); header.appendChild(closeBtn);

  outputBody = document.createElement("div");
  outputBody.id = "bk-out-body";

  const footer = document.createElement("div");
  footer.id = "bk-footer";

  const chatInput = document.createElement("textarea");
  chatInput.id = "bk-chat-input";
  chatInput.placeholder = "Continue the conversation…";
  chatInput.rows = 1;
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + "px";
  });

  const sendBtn = document.createElement("button");
  sendBtn.id = "bk-send-btn"; sendBtn.title = "Send";
  sendBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 13 13" fill="none">
    <path d="M1 6.5L12 1L7 12L5.5 7L1 6.5Z" fill="#0d0d0d" stroke="#0d0d0d" stroke-width="0.8" stroke-linejoin="round"/>
  </svg>`;

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doFollowUp(chatInput, sendBtn); }
  });
  sendBtn.addEventListener("click", () => doFollowUp(chatInput, sendBtn));

  footer.appendChild(chatInput); footer.appendChild(sendBtn);
  outputPanel.appendChild(header); outputPanel.appendChild(outputBody); outputPanel.appendChild(footer);
  outputPanel.addEventListener("mousedown", (e) => e.stopPropagation());
  document.body.appendChild(outputPanel);
  clampEl(outputPanel);
}

function destroyOutput() {
  if (outputPanel) { outputPanel.remove(); outputPanel = null; outputBody = null; }
  conversationHistory = [];
}

// ─── Messages ─────────────────────────────────────────────────────────────────
function addMessage(role, text, isError = false) {
  const wrap = document.createElement("div");
  wrap.className = "bk-msg bk-" + role;

  const label = document.createElement("div");
  label.className = "bk-msg-label";
  label.textContent = role === "user" ? "You" : "BlinkAI";

  const bubble = document.createElement("div");
  bubble.className = "bk-bubble" + (isError ? " bk-error" : "");
  bubble.textContent = text;

  if (isError) {
    const hint = document.createElement("span");
    hint.className = "bk-switch-hint";
    hint.textContent = "Switch model and retry ↗";
    hint.addEventListener("click", () => {
      activeModelIdx = (activeModelIdx + 1) % MODELS.length;
      const lbl = document.querySelector("#bk-model-label");
      if (lbl) lbl.textContent = MODELS[activeModelIdx].label;
      const tag = document.querySelector("#bk-out-model-tag");
      if (tag) tag.textContent = MODELS[activeModelIdx].label;
    });
    bubble.appendChild(document.createElement("br"));
    bubble.appendChild(hint);
  }

  wrap.appendChild(label); wrap.appendChild(bubble);
  outputBody.appendChild(wrap);
  outputBody.scrollTop = outputBody.scrollHeight;
}

function showThinking() {
  const t = document.createElement("div");
  t.className = "bk-thinking"; t.id = "bk-thinking";
  for (let i = 0; i < 3; i++) {
    const d = document.createElement("div"); d.className = "bk-dot"; t.appendChild(d);
  }
  outputBody.appendChild(t);
  outputBody.scrollTop = outputBody.scrollHeight;
}
function hideThinking() {
  const t = document.querySelector("#bk-thinking");
  if (t) t.remove();
}

// ─── Request ──────────────────────────────────────────────────────────────────
function doRequest(customPrompt, prefix) {
  if (!currentSelection || isProcessing) return;
  const typed   = customPrompt || "";
  const payload = typed
    ? typed + ":\n\n" + currentSelection
    : (prefix || "") + currentSelection;
  const displayText = typed
    || currentSelection.substring(0, 100) + (currentSelection.length > 100 ? "…" : "");

  isProcessing = true;
  removeToolbar();
  ensureOutputPanel();
  addMessage("user", displayText);
  showThinking();
  conversationHistory = [{ role: "user", content: payload }];

  chrome.runtime.sendMessage(
    { type: "BLINK_SUMMARY", payload, model: MODELS[activeModelIdx].id },
    (response) => {
      isProcessing = false;
      hideThinking();
      const isErr = !!(chrome.runtime.lastError || !response || response.error);
      const text  = isErr
        ? "❌ " + (chrome.runtime.lastError?.message || response?.error || "No response.")
        : (response.summary || "⚠️ Empty response");
      if (!isErr) conversationHistory.push({ role: "assistant", content: text });
      addMessage("ai", text, isErr);
    }
  );
}

// ─── Follow-up ────────────────────────────────────────────────────────────────
function doFollowUp(chatInput, sendBtn) {
  const text = chatInput.value.trim();
  if (!text || isProcessing) return;
  isProcessing = true;
  chatInput.value = ""; chatInput.style.height = "auto";
  sendBtn.classList.add("bk-busy");
  addMessage("user", text);
  showThinking();
  conversationHistory.push({ role: "user", content: text });

  const payload = conversationHistory
    .map((m) => (m.role === "user" ? "User" : "Assistant") + ": " + m.content)
    .join("\n\n");

  chrome.runtime.sendMessage(
    { type: "BLINK_SUMMARY", payload, model: MODELS[activeModelIdx].id },
    (response) => {
      isProcessing = false;
      sendBtn.classList.remove("bk-busy");
      hideThinking();
      const isErr = !!(chrome.runtime.lastError || !response || response.error);
      const aiText = isErr
        ? "❌ " + (chrome.runtime.lastError?.message || response?.error || "No response.")
        : (response.summary || "⚠️ Empty response");
      if (!isErr) conversationHistory.push({ role: "assistant", content: aiText });
      addMessage("ai", aiText, isErr);
    }
  );
}

// ─── Drag ─────────────────────────────────────────────────────────────────────
function makeDraggable(el, handle) {
  let sx, sy, ol, ot;
  handle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    sx = e.clientX; sy = e.clientY;
    const r = el.getBoundingClientRect(); ol = r.left; ot = r.top;
    e.preventDefault();
    const move = (e) => {
      el.style.left = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  ol + e.clientX - sx)) + "px";
      el.style.top  = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, ot + e.clientY - sy)) + "px";
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

// ─── Util ─────────────────────────────────────────────────────────────────────
function clampEl(el) {
  requestAnimationFrame(() => {
    const r = el.getBoundingClientRect();
    if (r.right  > window.innerWidth)  el.style.left = window.innerWidth  - el.offsetWidth  - 10 + "px";
    if (r.bottom > window.innerHeight) el.style.top  = window.innerHeight - el.offsetHeight - 10 + "px";
    if (r.top  < 0) el.style.top  = "10px";
    if (r.left < 0) el.style.left = "10px";
  });
}
function countWords(t) { return t.trim().split(/\s+/).filter(Boolean).length; }

// ─── Events ───────────────────────────────────────────────────────────────────
document.addEventListener("mouseup", (e) => {
  if ((toolbar     && toolbar.contains(e.target))     ||
      (outputPanel && outputPanel.contains(e.target))) return;
  const sel = window.getSelection().toString().trim();
  const wc  = countWords(sel);
  if (sel && wc >= 3 && wc <= 500) {
    currentSelection = sel;
    showToolbar(e.clientX + 12, e.clientY + 14);
  } else {
    removeToolbar();
    currentSelection = null;
  }
});

document.addEventListener("mousedown", (e) => {
  if (toolbar && !toolbar.contains(e.target)) removeToolbar();
});

let scrollTimer;
document.addEventListener("scroll", () => {
  clearTimeout(scrollTimer); scrollTimer = setTimeout(() => removeToolbar(), 80);
}, { passive: true });

window.addEventListener("beforeunload", () => {
  if (toolbar)     toolbar.remove();
  if (outputPanel) outputPanel.remove();
});

console.log("✅ BlinkAI v3 ready — select text to start");
