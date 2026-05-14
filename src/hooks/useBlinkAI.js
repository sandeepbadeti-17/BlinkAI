// src/hooks/useBlinkAI.js
import { useState, useCallback, useRef } from "react";
import { MODELS } from "../lib/constants";
import { useStream } from "./useStream";

export function useBlinkAI() {
  const [messages, setMessages] = useState([]);
  const [activeModelIdx, setActiveModelIdx] = useState(0);
  const conversationHistory = useRef([]);

  // useStream owns isStreaming state + the port lifecycle
  const { isStreaming, startStream, cancelStream } = useStream();

  // Track the id of the AI placeholder being streamed into
  const streamingAiId = useRef(null);

  // Load persisted model on mount
  useState(() => {
    chrome.storage.local.get("selectedModel", (data) => {
      if (data.selectedModel) {
        const idx = MODELS.findIndex((m) => m.id === data.selectedModel);
        if (idx !== -1) setActiveModelIdx(idx);
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

  // ── Core streaming helper ───────────────────────────────────────────────────
  const _streamRequest = useCallback(
    (payload, userLabel) => {
      if (isStreaming) return;

      // Add user message
      setMessages((prev) => [
        ...prev,
        { role: "user", text: userLabel, isError: false, id: Date.now() },
      ]);

      // Add empty AI placeholder
      const aiId = Date.now() + 1;
      streamingAiId.current = aiId;
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "", isError: false, id: aiId },
      ]);

      startStream(
        payload,
        MODELS[activeModelIdx].id,

        // onChunk — accumulated text so far
        (accumulated) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, text: accumulated } : m
            )
          );
        },

        // onDone — final accumulated text
        (finalText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, text: finalText || "⚠️ Empty response." } : m
            )
          );
          conversationHistory.current.push({
            role: "assistant",
            content: finalText,
          });
          streamingAiId.current = null;
        },

        // onError
        (errText) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, text: errText, isError: true } : m
            )
          );
          streamingAiId.current = null;
        }
      );
    },
    [isStreaming, activeModelIdx, startStream]
  );

  // ── Public actions ──────────────────────────────────────────────────────────
  const doInstantExplain = useCallback(
    (selection) => {
      const payload = `Explain this clearly and concisely:\n\n${selection}`;
      conversationHistory.current = [{ role: "user", content: payload }];
      _streamRequest(
        payload,
        selection.slice(0, 80) + (selection.length > 80 ? "…" : "")
      );
    },
    [_streamRequest]
  );

  const doRequest = useCallback(
    (selection, customPrompt, prefix) => {
      const payload = customPrompt
        ? `${customPrompt}:\n\n${selection}`
        : `${prefix || ""}${selection}`;
      const userLabel = customPrompt
        ? customPrompt
        : (prefix || "").split("\n")[0] || selection.slice(0, 80);

      conversationHistory.current = [{ role: "user", content: payload }];
      _streamRequest(payload, userLabel);
    },
    [_streamRequest]
  );

  const doFollowUp = useCallback(
    (text) => {
      if (!text.trim() || isStreaming) return;
      conversationHistory.current.push({ role: "user", content: text });

      // Build multi-turn payload
      const payload = conversationHistory.current
        .map((m) => (m.role === "user" ? "User" : "Assistant") + ": " + m.content)
        .join("\n\n");

      _streamRequest(payload, text);
    },
    [isStreaming, _streamRequest]
  );

  const resetConversation = useCallback(() => {
    cancelStream();
    setMessages([]);
    conversationHistory.current = [];
    streamingAiId.current = null;
  }, [cancelStream]);

  return {
    messages,
    isStreaming,           // OutputPanel uses this name — no rename needed
    activeModelIdx,
    currentModel: MODELS[activeModelIdx],
    switchModel,
    setActiveModelIdx: handleModelChange,
    doRequest,
    doInstantExplain,
    doFollowUp,
    resetConversation,
    MODELS,
  };
}