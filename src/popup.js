// popup.js — BlinkAI extension popup

const MODELS = [
  { id: "gemini-3-flash-preview",        label: "Gemini 3 Flash",      tag: "default" },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite", tag: "lite"  },
];

let currentModel = MODELS[0].id;
let keyVisible = false;

const keyInput          = document.getElementById("api-key-input");
const saveBtn           = document.getElementById("save-btn");
const statusMsg         = document.getElementById("status-msg");
const toggleBtn         = document.getElementById("toggle-visibility");
const deleteBtn         = document.getElementById("delete-key");
const modelList         = document.getElementById("model-list");
const keySavedIndicator = document.getElementById("key-saved-indicator");

// ── Load saved state ──────────────────────────────────────────────────────────
chrome.storage.local.get(["apiKey", "selectedModel"], (data) => {
  if (data.apiKey) {
    keyInput.value = data.apiKey;
    keySavedIndicator.style.display = "flex";
  }
  if (data.selectedModel) currentModel = data.selectedModel;
  renderModels();
});

// ── API Key actions ───────────────────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  const val = keyInput.value.trim();
  if (!val) { showStatus("Enter an API key first.", "err"); return; }
  chrome.storage.local.set({ apiKey: val }, () => {
    keySavedIndicator.style.display = "flex";
    showStatus("✓ Key saved!", "ok");
  });
});

toggleBtn.addEventListener("click", () => {
  keyVisible = !keyVisible;
  keyInput.type = keyVisible ? "text" : "password";
  toggleBtn.textContent = keyVisible ? "🙈" : "👁";
});

deleteBtn.addEventListener("click", () => {
  chrome.storage.local.remove("apiKey", () => {
    keyInput.value = "";
    keySavedIndicator.style.display = "none";
    showStatus("Key deleted.", "err");
  });
});

keyInput.addEventListener("input", () => { statusMsg.textContent = ""; });

// ── Model list ────────────────────────────────────────────────────────────────
function renderModels() {
  modelList.innerHTML = "";
  MODELS.forEach((m) => {
    const item = document.createElement("div");
    item.className = "model-item" + (m.id === currentModel ? " selected" : "");
    item.innerHTML = `
      <div class="model-dot"></div>
      <span class="model-name">${m.label}</span>
      <span class="model-tag">${m.tag}</span>
    `;
    item.addEventListener("click", () => {
      currentModel = m.id;
      chrome.storage.local.set({ selectedModel: m.id });
      renderModels();
    });
    modelList.appendChild(item);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = "status " + type;
  if (type === "ok") setTimeout(() => { statusMsg.textContent = ""; }, 2500);
}
