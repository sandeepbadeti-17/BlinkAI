// src/components/OutputPanel.jsx
import { useState, useRef, useEffect } from "react";
import { useDraggable } from "../hooks/useDraggable";
import { Message } from "./Message";
import { SendIcon } from "./SendIcon";
import { MODELS } from "../lib/constants";

export function OutputPanel({
  messages,
  isStreaming,
  activeModelIdx,
  onFollowUp,
  onSwitchModel,
  onClose,
}) {
  const [chatValue, setChatValue] = useState("");
  const { elRef, onHandleMouseDown } = useDraggable();
  const bodyRef = useRef(null);
  const chatInputRef = useRef(null);

  // Auto-scroll as chunks come in
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  // Clamp + position on mount
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const px = Math.max(10, Math.min(window.innerWidth - 420, window.innerWidth * 0.56));
    const py = Math.max(10, Math.min(window.innerHeight - 400, window.innerHeight * 0.1));
    el.style.left = px + "px";
    el.style.top = py + "px";
  }, []);

  const handleSend = () => {
    const text = chatValue.trim();
    if (!text || isStreaming) return;
    setChatValue("");
    if (chatInputRef.current) chatInputRef.current.style.height = "auto";
    onFollowUp(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find the last AI message index for streaming cursor
  const lastAiIdx = messages.reduce((acc, m, i) => (m.role === "ai" ? i : acc), -1);

  return (
    <div
      ref={elRef}
      id="bk-output"
      style={{ position: "fixed" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div id="bk-out-header" onMouseDown={onHandleMouseDown}>
        <div id="bk-out-logo">⚡</div>
        <div id="bk-out-title">BlinkAI</div>
        <div id="bk-out-model-tag">{MODELS[activeModelIdx].label}</div>
        <button id="bk-out-close" title="Close" onClick={onClose}>✕</button>
      </div>

      {/* Body */}
      <div id="bk-out-body" ref={bodyRef}>
        {messages.map((msg, idx) => (
          <Message
            key={msg.id}
            role={msg.role}
            text={msg.text}
            isError={msg.isError}
            isStreaming={isStreaming && idx === lastAiIdx}
            onSwitchModel={onSwitchModel}
          />
        ))}
      </div>

      {/* Footer */}
      <div id="bk-footer">
        <textarea
          ref={chatInputRef}
          id="bk-chat-input"
          placeholder={isStreaming ? "Waiting for response…" : "Continue the conversation…"}
          rows={1}
          value={chatValue}
          disabled={isStreaming}
          onChange={(e) => {
            setChatValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          id="bk-send-btn"
          title="Send"
          className={isStreaming ? "bk-busy" : ""}
          onClick={handleSend}
          disabled={isStreaming}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
