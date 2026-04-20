// js/request.js - BlinkAI v3 AI request & follow-up logic

import { state }           from "./state.js";
import { MODELS }          from "./constants.js";
import { removeToolbar }   from "./ui.toolbar.js";
import { ensureOutputPanel } from "./ui.output.js";
import { addMessage, showThinking, hideThinking } from "./ui.messages.js";

/**
 * Sends the initial request to the AI with the current text selection.
 * @param {string|null} customPrompt  - User-typed question (overrides prefix).
 * @param {string|null} prefix        - Preset prefix to prepend to the selection.
 */
export function doRequest(customPrompt, prefix) {
  if (!state.currentSelection || state.isProcessing) return;

  const typed       = customPrompt || "";
  const payload     = typed
    ? typed + ":\n\n" + state.currentSelection
    : (prefix || "") + state.currentSelection;
  const displayText = typed
    || state.currentSelection.substring(0, 100)
    + (state.currentSelection.length > 100 ? "…" : "");

  state.isProcessing = true;
  removeToolbar();
  ensureOutputPanel();
  addMessage("user", displayText);
  showThinking();
  state.conversationHistory = [{ role: "user", content: payload }];

  chrome.runtime.sendMessage(
    { type: "BLINK_SUMMARY", payload, model: MODELS[state.activeModelIdx].id },
    (response) => {
      state.isProcessing = false;
      hideThinking();
      const isErr  = !!(chrome.runtime.lastError || !response || response.error);
      const text   = isErr
        ? "❌ " + (chrome.runtime.lastError?.message || response?.error || "No response.")
        : (response.summary || "⚠️ Empty response");
      if (!isErr) state.conversationHistory.push({ role: "assistant", content: text });
      addMessage("ai", text, isErr);
    }
  );
}

/**
 * Sends a follow-up message using accumulated conversation history.
 * @param {HTMLTextAreaElement} chatInput - The chat textarea element.
 * @param {HTMLButtonElement}   sendBtn   - The send button (shows busy state).
 */
export function doFollowUp(chatInput, sendBtn) {
  const text = chatInput.value.trim();
  if (!text || state.isProcessing) return;

  state.isProcessing       = true;
  chatInput.value          = "";
  chatInput.style.height   = "auto";
  sendBtn.classList.add("bk-busy");

  addMessage("user", text);
  showThinking();
  state.conversationHistory.push({ role: "user", content: text });

  const payload = state.conversationHistory
    .map((m) => (m.role === "user" ? "User" : "Assistant") + ": " + m.content)
    .join("\n\n");

  chrome.runtime.sendMessage(
    { type: "BLINK_SUMMARY", payload, model: MODELS[state.activeModelIdx].id },
    (response) => {
      state.isProcessing = false;
      sendBtn.classList.remove("bk-busy");
      hideThinking();
      const isErr  = !!(chrome.runtime.lastError || !response || response.error);
      const aiText = isErr
        ? "❌ " + (chrome.runtime.lastError?.message || response?.error || "No response.")
        : (response.summary || "⚠️ Empty response");
      if (!isErr) state.conversationHistory.push({ role: "assistant", content: aiText });
      addMessage("ai", aiText, isErr);
    }
  );
}
