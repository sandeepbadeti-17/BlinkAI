// popup.js — BlinkAI popup

let isEnabled  = true;
let keyVisible = false;
let hasKey     = false;
let isEditing  = false; // true when user clicked "Edit Key"

const powerBtn      = document.getElementById("power-btn");
const powerLabel    = document.getElementById("power-label");
const iconOff       = document.getElementById("icon-off");
const iconOn        = document.getElementById("icon-on");

const noKeyView     = document.getElementById("no-key-view");
const hasKeyView    = document.getElementById("has-key-view");
const keyInput      = document.getElementById("api-key-input");
const saveBtn       = document.getElementById("save-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const statusMsg     = document.getElementById("status-msg");
const statusMsg2    = document.getElementById("status-msg-2");
const toggleBtn     = document.getElementById("toggle-visibility");
const editBtn       = document.getElementById("edit-btn");
const deleteBtn     = document.getElementById("delete-btn");
const modelSelect   = document.getElementById("model-select");

// ── Load saved state ──────────────────────────────────────────────────────────
chrome.storage.local.get(["apiKey", "blinkEnabled", "selectedModel"], (data) => {
  hasKey    = !!data.apiKey;
  isEnabled = data.blinkEnabled !== false;
  renderPower();
  renderKeyView();
  renderModelSelection(data.selectedModel || "gemini-3.1-flash-lite");
});

// ── Power toggle ──────────────────────────────────────────────────────────────
powerBtn.addEventListener("click", () => {
  isEnabled = !isEnabled;
  chrome.storage.local.set({ blinkEnabled: isEnabled });
  renderPower();
});

function renderPower() {
  if (isEnabled) {
    powerBtn.className   = "power-btn on";
    powerLabel.className = "power-label on";
    powerLabel.textContent = "ON";
    iconOff.style.display = "none";
    iconOn.style.display  = "block";
  } else {
    powerBtn.className   = "power-btn off";
    powerLabel.className = "power-label off";
    powerLabel.textContent = "OFF";
    iconOff.style.display = "block";
    iconOn.style.display  = "none";
  }
}

// ── Key view render ───────────────────────────────────────────────────────────
function renderKeyView() {
  if (hasKey && !isEditing) {
    noKeyView.style.display  = "none";
    hasKeyView.style.display = "flex";
    cancelEditBtn.style.display = "none";
  } else {
    noKeyView.style.display  = "flex";
    hasKeyView.style.display = "none";
    // Show cancel only when editing an existing key (not fresh setup)
    cancelEditBtn.style.display = isEditing ? "block" : "none";
    if (!isEditing) keyInput.value = "";
  }
}

// ── Save key ──────────────────────────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  const val = keyInput.value.trim();
  if (!val) { showStatus("Enter an API key first.", "err", statusMsg); return; }
  chrome.storage.local.set({ apiKey: val }, () => {
    hasKey    = true;
    isEditing = false;
    renderKeyView();
    showStatus("", "ok", statusMsg);
  });
});

// ── Cancel edit — go back to has-key view ─────────────────────────────────────
cancelEditBtn.addEventListener("click", () => {
  isEditing = false;
  renderKeyView();
  statusMsg.textContent = "";
});

// ── Toggle key visibility ─────────────────────────────────────────────────────
toggleBtn.addEventListener("click", () => {
  keyVisible = !keyVisible;
  keyInput.type = keyVisible ? "text" : "password";
  toggleBtn.textContent = keyVisible ? "🙈" : "👁";
});

keyInput.addEventListener("input", () => { statusMsg.textContent = ""; });

// ── Edit key — switch to input view with prefilled value ──────────────────────
editBtn.addEventListener("click", () => {
  chrome.storage.local.get("apiKey", (data) => {
    keyInput.value = data.apiKey || "";
    isEditing = true;
    hasKey    = true; // keep hasKey true so cancel works
    renderKeyView();
    keyInput.focus();
  });
});

// ── Delete key ────────────────────────────────────────────────────────────────
deleteBtn.addEventListener("click", () => {
  chrome.storage.local.remove("apiKey", () => {
    hasKey    = false;
    isEditing = false;
    renderKeyView();
  });
});

// ── Model selection ───────────────────────────────────────────────────────────
function renderModelSelection(selectedId) {
  modelSelect.value = selectedId || "gemini-3.1-flash-lite";
}

modelSelect.addEventListener("change", () => {
  chrome.storage.local.set({ selectedModel: modelSelect.value });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function showStatus(msg, type, el) {
  el.textContent = msg;
  el.className = "status " + type;
  if (type === "ok" && msg) setTimeout(() => { el.textContent = ""; }, 2500);
}
