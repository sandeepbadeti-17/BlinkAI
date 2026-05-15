// src/hooks/useBlinkAI.js
import { useState, useCallback, useRef } from "react";
import { MODELS } from "../lib/constants";

export function useBlinkAI() {
  const [messages, setMessages]             = useState([]);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [activeModelIdx, setActiveModelIdx] = useState(0);
  const conversationHistory = useRef([]);
  const newMsgIds           = useRef(new Set());
  const lastPayloadRef      = useRef(null);
  // Store the model index that should be used for next retry
  const pendingRetryModel   = useRef(null);

  // Load persisted model on mount — default to index 0 (Gemini 3 Flash)
  useState(() => {
    chrome.storage.local.get("selectedModel", (data) => {
      if (data.selectedModel) {
        const idx = MODELS.findIndex((m) => m.id === data.selectedModel);
        if (idx !== -1) setActiveModelIdx(idx);
      }
      // If nothing stored yet, persist the default
      else {
        chrome.storage.local.set({ selectedModel: MODELS[0].id });
      }
    });
  });

  const switchModel = useCallback(() => {
    setActiveModelIdx((prev) => {
      const next = (prev + 1) % MODELS.length;
      chrome.storage.local.set({ selectedModel: MODELS[next].id });
      return next;
    });
  }, []);

  const handleModelChange = useCallback((idx) => {
    setActiveModelIdx(idx);
    chrome.storage.local.set({ selectedModel: MODELS[idx].id });
  }, []);

  // ── Raw API fire — takes an explicit modelIdx so retry can pass the new one ──
  const _fire = useCallback((payload, modelIdx) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "BLINK_REQUEST", payload, model: MODELS[modelIdx].id },
        (response) => resolve(response)
      );
    });
  }, []);

  // ── Core request ──────────────────────────────────────────────────
  const _sendRequest = useCallback(
    async (payload, userLabel, explicitModelIdx) => {
      if (isProcessing) return;
      setIsProcessing(true);
      lastPayloadRef.current = payload;

      const useIdx    = explicitModelIdx !== undefined ? explicitModelIdx : activeModelIdx;
      const userMsgId = Date.now() + Math.random();
      const aiId      = userMsgId + 1;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: userLabel, isError: false, id: userMsgId },
        { role: "ai",   text: "…",       isError: false, id: aiId      },
      ]);

      const response = await _fire(payload, useIdx);
      setIsProcessing(false);

      const isErr = !!(chrome.runtime.lastError || !response || response.error);
      const text  = isErr
        ? (chrome.runtime.lastError?.message || response?.text || "No response.")
        : response.text || "⚠️ Empty response";

      if (!isErr) newMsgIds.current.add(aiId);

      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, text, isError: isErr, isRateLimit: response?.isRateLimit } : m))
      );
      if (!isErr) {
        conversationHistory.current.push({ role: "assistant", content: text });
      }
    },
    [isProcessing, activeModelIdx, _fire]
  );

  // ── Switch model THEN immediately retry last payload ──────────────
  // This is the key fix: we compute the new index, persist it, update
  // state, and then fire the request using the new index directly
  // (not relying on the state having settled).
  const switchModelAndRetry = useCallback(() => {
    if (!lastPayloadRef.current) return;
    if (isProcessing) return;

    setActiveModelIdx((prev) => {
      const next = (prev + 1) % MODELS.length;
      chrome.storage.local.set({ selectedModel: MODELS[next].id });

      // Remove last AI error bubble
      setMessages((msgs) => {
        const idx = [...msgs].reverse().findIndex((m) => m.role === "ai" && m.isError);
        if (idx === -1) return msgs;
        return msgs.filter((_, i) => i !== msgs.length - 1 - idx);
      });

      // Fire immediately with `next` — don't wait for React state
      setIsProcessing(true);
      const aiId = Date.now() + Math.random();
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "…", isError: false, id: aiId },
      ]);

      chrome.runtime.sendMessage(
        { type: "BLINK_REQUEST", payload: lastPayloadRef.current, model: MODELS[next].id },
        (response) => {
          setIsProcessing(false);
          const isErr = !!(chrome.runtime.lastError || !response || response.error);
          const text  = isErr
            ? (chrome.runtime.lastError?.message || response?.text || "No response.")
            : response.text || "⚠️ Empty response";
          if (!isErr) newMsgIds.current.add(aiId);
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, text, isError: isErr } : m))
          );
          if (!isErr) conversationHistory.current.push({ role: "assistant", content: text });
        }
      );

      return next;
    });
  }, [isProcessing]);

  const doInstantExplain = useCallback(
    (selection) => {
      const payload = `Explain this clearly and concisely:\n\n${selection}`;
      conversationHistory.current = [{ role: "user", content: payload }];
      _sendRequest(payload, selection.slice(0, 80) + (selection.length > 80 ? "…" : ""));
    },
    [_sendRequest]
  );

  const doRequest = useCallback(
    (selection, customPrompt, prefix) => {
      const payload   = customPrompt ? `${customPrompt}:\n\n${selection}` : `${prefix || ""}${selection}`;
      const userLabel = customPrompt ? customPrompt : (prefix || "").split("\n")[0] || selection.slice(0, 80);
      conversationHistory.current = [{ role: "user", content: payload }];
      _sendRequest(payload, userLabel);
    },
    [_sendRequest]
  );

  const doFollowUp = useCallback(
    (text) => {
      if (!text.trim() || isProcessing) return;
      conversationHistory.current.push({ role: "user", content: text });
      const payload = conversationHistory.current
        .map((m) => (m.role === "user" ? "User" : "Assistant") + ": " + m.content)
        .join("\n\n");
      lastPayloadRef.current = payload;
      _sendRequest(payload, text);
    },
    [isProcessing, _sendRequest]
  );

  const resetConversation = useCallback(() => {
    setMessages([]);
    conversationHistory.current = [];
    lastPayloadRef.current      = null;
    setIsProcessing(false);
    newMsgIds.current.clear();
  }, []);

  return {
    messages, isProcessing, activeModelIdx,
    currentModel: MODELS[activeModelIdx],
    switchModel, switchModelAndRetry,
    setActiveModelIdx: handleModelChange,
    doRequest, doInstantExplain, doFollowUp, resetConversation,
    newMsgIds: newMsgIds.current,
    MODELS,
  };
}
