console.log("✅ BlinkAI content script loaded");

chrome.runtime.sendMessage({ greeting: "hello" }, (response) => {
  if (chrome.runtime.lastError) console.error("❌ Background:", chrome.runtime.lastError);
  else console.log("✅ Background ready:", response);
});

// ─── State ────────────────────────────────────────────────────────────────────
let toolbar      = null;
let outputPanel  = null;
let currentSelection     = null;
let isProcessing         = false;
let conversationHistory  = [];

// ─── Styles ───────────────────────────────────────────────────────────────────
function injectStyles() {
  if (document.querySelector("#blinkai-styles")) return;
  const s = document.createElement("style");
  s.id = "blinkai-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

    @keyframes bkFadeUp {
      from { opacity:0; transform:translateY(8px) scale(0.97); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }
    @keyframes bkSlideIn {
      from { opacity:0; transform:translateX(16px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes bkPulse {
      0%,100% { opacity:1; } 50% { opacity:0.3; }
    }

    /* ── Toolbar ── */
    #bk-toolbar {
      position: fixed;
      z-index: 2147483640;
      background: #111111;
      border: 1px solid rgba(255,200,50,0.22);
      border-radius: 14px;
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 9px;
      width: 310px;
      box-shadow: 0 10px 36px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
      font-family: 'DM Sans', sans-serif;
      animation: bkFadeUp 0.18s ease;
    }
    #bk-sel-preview {
      font-size: 11px;
      color: rgba(255,255,255,0.28);
      font-family: 'DM Mono', monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #bk-toolbar-top {
      display: flex;
      gap: 7px;
      align-items: center;
    }
    #bk-toolbar-logo { font-size: 17px; flex-shrink: 0; }
    #bk-prompt-input {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.11);
      border-radius: 8px;
      color: #f0f0f0;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      padding: 7px 11px;
      outline: none;
      transition: border-color 0.18s;
    }
    #bk-prompt-input::placeholder { color: rgba(255,255,255,0.28); }
    #bk-prompt-input:focus { border-color: rgba(255,200,50,0.5); }
    #bk-toolbar-btns { display: flex; gap: 6px; }
    .bk-tbtn {
      flex: 1;
      padding: 7px 0;
      border: none;
      border-radius: 8px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 4px;
      transition: all 0.14s ease;
      letter-spacing: 0.02em;
    }
    #bk-tbtn-blink {
      background: linear-gradient(135deg,#FFD700,#FF9500);
      color: #000;
    }
    #bk-tbtn-blink:hover  { filter:brightness(1.1); transform:translateY(-1px); }
    #bk-tbtn-blink:active { transform:scale(0.97); }
    #bk-tbtn-explain {
      background: rgba(255,255,255,0.08);
      color: #ddd;
      border: 1px solid rgba(255,255,255,0.11);
    }
    #bk-tbtn-explain:hover  { background:rgba(255,255,255,0.13); transform:translateY(-1px); }
    #bk-tbtn-explain:active { transform:scale(0.97); }
    .bk-tbtn.bk-busy { opacity:0.45; pointer-events:none; }

    /* ── Output panel ── */
    #bk-output {
      position: fixed;
      z-index: 2147483641;
      width: 400px;
      max-height: 560px;
      min-height: 120px;
      background: #111111;
      border: 1px solid rgba(255,200,50,0.2);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 18px 54px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.04);
      font-family: 'DM Sans', sans-serif;
      overflow: hidden;
      animation: bkSlideIn 0.22s ease;
    }
    #bk-out-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      background: rgba(255,200,50,0.05);
      cursor: grab;
      user-select: none;
      flex-shrink: 0;
    }
    #bk-out-header:active { cursor: grabbing; }
    #bk-out-logo { font-size: 15px; }
    #bk-out-title {
      flex: 1;
      font-size: 12px;
      font-weight: 600;
      color: #FFD700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    #bk-out-close {
      width: 22px; height: 22px;
      border-radius: 50%;
      background: rgba(255,255,255,0.07);
      border: none;
      color: rgba(255,255,255,0.45);
      font-size: 11px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.14s;
      flex-shrink: 0;
    }
    #bk-out-close:hover { background:rgba(255,80,80,0.28); color:#ff6b6b; }

    #bk-out-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 15px;
      display: flex;
      flex-direction: column;
      gap: 11px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.13) transparent;
    }
    #bk-out-body::-webkit-scrollbar { width: 4px; }
    #bk-out-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.13); border-radius:10px; }

    .bk-msg { display:flex; flex-direction:column; gap:3px; animation:bkFadeUp 0.2s ease; }
    .bk-msg-label {
      font-size: 10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase;
    }
    .bk-msg.bk-user .bk-msg-label { color:rgba(255,200,50,0.55); }
    .bk-msg.bk-ai   .bk-msg-label { color:rgba(80,200,140,0.55); }
    .bk-bubble {
      font-size: 13.5px; line-height:1.65; color:#e6e6e6;
      border-radius: 10px; padding:10px 13px;
      white-space: pre-wrap; word-break:break-word;
    }
    .bk-msg.bk-user .bk-bubble {
      background:rgba(255,200,50,0.08);
      border:1px solid rgba(255,200,50,0.13);
      color:#f0e4b8;
    }
    .bk-msg.bk-ai .bk-bubble {
      background:rgba(255,255,255,0.05);
      border:1px solid rgba(255,255,255,0.07);
    }

    .bk-thinking {
      display:flex; gap:5px; align-items:center;
      padding:10px 13px;
      background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.07);
      border-radius:10px;
    }
    .bk-dot {
      width:6px; height:6px; border-radius:50%;
      background:rgba(255,200,50,0.55);
      animation:bkPulse 1.2s ease infinite;
    }
    .bk-dot:nth-child(2) { animation-delay:0.2s; }
    .bk-dot:nth-child(3) { animation-delay:0.4s; }

    /* ── Chat footer ── */
    #bk-footer {
      border-top:1px solid rgba(255,255,255,0.07);
      padding:9px 11px;
      display:flex; gap:6px; align-items:flex-end;
      flex-shrink:0;
      background:rgba(0,0,0,0.18);
    }
    #bk-chat-input {
      flex:1;
      background:rgba(255,255,255,0.06);
      border:1px solid rgba(255,255,255,0.1);
      border-radius:9px;
      color:#f0f0f0;
      font-family:'DM Sans',sans-serif;
      font-size:13px;
      padding:7px 11px;
      outline:none;
      resize:none;
      min-height:34px;
      max-height:96px;
      line-height:1.45;
      overflow-y:auto;
      transition:border-color 0.18s;
    }
    #bk-chat-input::placeholder { color:rgba(255,255,255,0.24); }
    #bk-chat-input:focus { border-color:rgba(255,200,50,0.4); }
    #bk-send-btn {
      width:34px; height:34px;
      border-radius:9px; border:none;
      background:linear-gradient(135deg,#FFD700,#FF9500);
      cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; margin-bottom:1px;
      transition:all 0.14s;
    }
    #bk-send-btn:hover  { filter:brightness(1.1); transform:scale(1.06); }
    #bk-send-btn:active { transform:scale(0.94); }
    #bk-send-btn.bk-busy { opacity:0.4; pointer-events:none; }
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

  const preview = document.createElement("div");
  preview.id = "bk-sel-preview";
  const previewText = currentSelection.length > 60
    ? '"' + currentSelection.substring(0, 60) + '…"'
    : '"' + currentSelection + '"';
  preview.textContent = previewText;

  const top = document.createElement("div");
  top.id = "bk-toolbar-top";

  const logo = document.createElement("div");
  logo.id = "bk-toolbar-logo";
  logo.textContent = "⚡";

  const input = document.createElement("input");
  input.id = "bk-prompt-input";
  input.type = "text";
  input.placeholder = "Ask anything about the selection…";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); doRequest(input.value.trim() || null, null); }
  });

  top.appendChild(logo);
  top.appendChild(input);

  const btns = document.createElement("div");
  btns.id = "bk-toolbar-btns";

  const bBlink = document.createElement("button");
  bBlink.id = "bk-tbtn-blink";
  bBlink.className = "bk-tbtn";
  bBlink.innerHTML = "⚡ Blink";
  bBlink.addEventListener("click", () => doRequest(null, "Summarize the following text briefly:\n\n"));

  const bExplain = document.createElement("button");
  bExplain.id = "bk-tbtn-explain";
  bExplain.className = "bk-tbtn";
  bExplain.innerHTML = "📖 Explain";
  bExplain.addEventListener("click", () => doRequest(null, "Explain the following text clearly and concisely:\n\n"));

  btns.appendChild(bBlink);
  btns.appendChild(bExplain);

  toolbar.appendChild(preview);
  toolbar.appendChild(top);
  toolbar.appendChild(btns);
  toolbar.addEventListener("mousedown", (e) => e.stopPropagation());

  document.body.appendChild(toolbar);
  clampEl(toolbar);
}

function removeToolbar() {
  if (toolbar) { toolbar.remove(); toolbar = null; }
}

// ─── Output panel ─────────────────────────────────────────────────────────────
let outputBody = null; // reference to scrollable body div

function ensureOutputPanel() {
  if (outputPanel) return; // already open

  const px = Math.max(10, Math.min(window.innerWidth  - 420, window.innerWidth  * 0.55));
  const py = Math.max(10, Math.min(window.innerHeight - 400, window.innerHeight * 0.12));

  outputPanel = document.createElement("div");
  outputPanel.id = "bk-output";
  outputPanel.style.left = px + "px";
  outputPanel.style.top  = py + "px";

  // header
  const header = document.createElement("div");
  header.id = "bk-out-header";
  makeDraggable(outputPanel, header);

  const logo = document.createElement("div");
  logo.id = "bk-out-logo";
  logo.textContent = "⚡";

  const title = document.createElement("div");
  title.id = "bk-out-title";
  title.textContent = "BlinkAI";

  const closeBtn = document.createElement("button");
  closeBtn.id = "bk-out-close";
  closeBtn.innerHTML = "✕";
  closeBtn.title = "Close";
  closeBtn.addEventListener("click", destroyOutput);

  header.appendChild(logo);
  header.appendChild(title);
  header.appendChild(closeBtn);

  // body
  outputBody = document.createElement("div");
  outputBody.id = "bk-out-body";

  // footer
  const footer = document.createElement("div");
  footer.id = "bk-footer";

  const chatInput = document.createElement("textarea");
  chatInput.id = "bk-chat-input";
  chatInput.placeholder = "Continue the conversation…";
  chatInput.rows = 1;
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 96) + "px";
  });
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doFollowUp(chatInput, sendBtn); }
  });

  const sendBtn = document.createElement("button");
  sendBtn.id = "bk-send-btn";
  sendBtn.title = "Send";
  sendBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M1 6.5L12 1L7 12L5.5 7L1 6.5Z" fill="#000" stroke="#000" stroke-width="0.7" stroke-linejoin="round"/>
  </svg>`;
  sendBtn.addEventListener("click", () => doFollowUp(chatInput, sendBtn));

  footer.appendChild(chatInput);
  footer.appendChild(sendBtn);

  outputPanel.appendChild(header);
  outputPanel.appendChild(outputBody);
  outputPanel.appendChild(footer);

  // output panel never closes on outside clicks
  outputPanel.addEventListener("mousedown", (e) => e.stopPropagation());

  document.body.appendChild(outputPanel);
  clampEl(outputPanel);
}

function destroyOutput() {
  if (outputPanel) { outputPanel.remove(); outputPanel = null; outputBody = null; }
  conversationHistory = [];
}

// ─── Message helpers ──────────────────────────────────────────────────────────
function addMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = "bk-msg bk-" + role;

  const label = document.createElement("div");
  label.className = "bk-msg-label";
  label.textContent = role === "user" ? "You" : "BlinkAI";

  const bubble = document.createElement("div");
  bubble.className = "bk-bubble";
  bubble.textContent = text;

  wrap.appendChild(label);
  wrap.appendChild(bubble);
  outputBody.appendChild(wrap);
  outputBody.scrollTop = outputBody.scrollHeight;
}

function showThinking() {
  const t = document.createElement("div");
  t.className = "bk-thinking";
  t.id = "bk-thinking";
  for (let i = 0; i < 3; i++) {
    const d = document.createElement("div");
    d.className = "bk-dot";
    t.appendChild(d);
  }
  outputBody.appendChild(t);
  outputBody.scrollTop = outputBody.scrollHeight;
}

function hideThinking() {
  const t = document.querySelector("#bk-thinking");
  if (t) t.remove();
}

// ─── First request ────────────────────────────────────────────────────────────
function doRequest(customPrompt, prefix) {
  if (!currentSelection || isProcessing) return;

  const input = document.querySelector("#bk-prompt-input");
  const typed = (customPrompt !== null ? customPrompt : (input ? input.value.trim() : "")) || "";

  let payload;
  let displayText;
  if (typed) {
    payload     = typed + ":\n\n" + currentSelection;
    displayText = typed;
  } else {
    payload     = (prefix || "") + currentSelection;
    displayText = currentSelection.substring(0, 100) + (currentSelection.length > 100 ? "…" : "");
  }

  isProcessing = true;
  removeToolbar();
  ensureOutputPanel();
  addMessage("user", displayText);
  showThinking();

  conversationHistory = [{ role: "user", content: payload }];

  chrome.runtime.sendMessage({ type: "BLINK_SUMMARY", payload }, (response) => {
    isProcessing = false;
    hideThinking();

    if (chrome.runtime.lastError || !response) {
      addMessage("ai", "❌ " + (chrome.runtime.lastError ? chrome.runtime.lastError.message : "No response"));
      return;
    }
    const text = response.summary || "⚠️ Empty response";
    conversationHistory.push({ role: "assistant", content: text });
    addMessage("ai", text);
  });
}

// ─── Follow-up ────────────────────────────────────────────────────────────────
function doFollowUp(chatInput, sendBtn) {
  const text = chatInput.value.trim();
  if (!text || isProcessing) return;

  isProcessing = true;
  chatInput.value = "";
  chatInput.style.height = "auto";
  sendBtn.classList.add("bk-busy");

  addMessage("user", text);
  showThinking();

  conversationHistory.push({ role: "user", content: text });

  // send full conversation as context
  const payload = conversationHistory
    .map((m) => (m.role === "user" ? "User" : "Assistant") + ": " + m.content)
    .join("\n\n");

  chrome.runtime.sendMessage({ type: "BLINK_SUMMARY", payload }, (response) => {
    isProcessing = false;
    sendBtn.classList.remove("bk-busy");
    hideThinking();

    if (chrome.runtime.lastError || !response) {
      addMessage("ai", "❌ " + (chrome.runtime.lastError ? chrome.runtime.lastError.message : "No response"));
      return;
    }
    const aiText = response.summary || "⚠️ Empty response";
    conversationHistory.push({ role: "assistant", content: aiText });
    addMessage("ai", aiText);
  });
}

// ─── Drag ─────────────────────────────────────────────────────────────────────
function makeDraggable(el, handle) {
  let sx, sy, ol, ot;
  handle.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    sx = e.clientX; sy = e.clientY;
    const r = el.getBoundingClientRect();
    ol = r.left; ot = r.top;
    e.preventDefault();
    const move = (e) => {
      let nl = ol + (e.clientX - sx);
      let nt = ot + (e.clientY - sy);
      nl = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  nl));
      nt = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, nt));
      el.style.left = nl + "px";
      el.style.top  = nt + "px";
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
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

function countWords(t) {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Event listeners ──────────────────────────────────────────────────────────
document.addEventListener("mouseup", (e) => {
  if ((toolbar     && toolbar.contains(e.target)) ||
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

// outside click closes toolbar only - output panel is immune
document.addEventListener("mousedown", (e) => {
  if (toolbar && !toolbar.contains(e.target)) removeToolbar();
  // output panel intentionally NOT closed here
});

// scroll closes toolbar only
let scrollTimer;
document.addEventListener("scroll", () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => { removeToolbar(); }, 80);
}, { passive: true });

window.addEventListener("beforeunload", () => {
  if (toolbar)     toolbar.remove();
  if (outputPanel) outputPanel.remove();
});

console.log("✅ BlinkAI ready - select text to start");
