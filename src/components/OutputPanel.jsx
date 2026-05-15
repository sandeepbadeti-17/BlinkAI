// src/components/OutputPanel.jsx
import { useState, useRef, useEffect } from "react";
import { useDraggable } from "../hooks/useDraggable";
import { Message } from "./Message";
import { SendIcon } from "./SendIcon";
import { MODELS } from "../lib/constants";

const MIN_W = 300, MIN_H = 280;
const DEFAULT_W = 380, DEFAULT_H = 480;

export function OutputPanel({
  messages, isProcessing, activeModelIdx,
  newMsgIds, onFollowUp, onSwitchModel, onClose, onModelChange,
}) {
  const [chatValue, setChatValue]       = useState("");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const { elRef, onHandleMouseDown }    = useDraggable();
  const bodyRef      = useRef(null);
  const chatInputRef = useRef(null);

  // Listen for model changes from popup (storage events)
  useEffect(() => {
    const listener = (changes) => {
      if ("selectedModel" in changes) {
        const newId = changes.selectedModel.newValue;
        const idx = MODELS.findIndex((m) => m.id === newId);
        if (idx !== -1) onModelChange(idx);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [onModelChange]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  // Set initial position + size once
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const l = Math.max(10, Math.min(window.innerWidth  - DEFAULT_W - 10, window.innerWidth  * 0.56));
    const t = Math.max(10, Math.min(window.innerHeight - DEFAULT_H - 10, window.innerHeight * 0.1));
    el.style.left   = l + "px";
    el.style.top    = t + "px";
    el.style.width  = DEFAULT_W + "px";
    el.style.height = DEFAULT_H + "px";
  }, []);

  // ── Resize ────────────────────────────────────────────────────────
  function onResizeMouseDown(e, edge) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const el = elRef.current;
    if (!el) return;

    // Use getBoundingClientRect for true viewport position —
    // style.left/top can be empty if the element was positioned via BCR earlier.
    // BCR gives us the real rendered position every time.
    const rect = el.getBoundingClientRect();
    const W0 = rect.width;
    const H0 = rect.height;
    const L0 = rect.left;   // left edge in viewport coords
    const T0 = rect.top;    // top edge in viewport coords
    const R0 = rect.right;  // right edge — FIXED for west drags
    const B0 = rect.bottom; // bottom edge — FIXED for north drags

    const X0 = e.clientX;
    const Y0 = e.clientY;

    const saved = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    function onMove(ev) {
      const dx = ev.clientX - X0;
      const dy = ev.clientY - Y0;

      let w = W0, h = H0, l = L0, t = T0;

      // East: left fixed at L0, right moves
      if (edge === "e")  { w = W0 + dx; l = L0; }
      // West: right fixed at R0, left moves → l = R0 - w
      if (edge === "w")  { w = W0 - dx; l = R0 - w; }
      // South: top fixed at T0, bottom moves
      if (edge === "s")  { h = H0 + dy; t = T0; }
      // North: bottom fixed at B0, top moves → t = B0 - h
      if (edge === "n")  { h = H0 - dy; t = B0 - h; }

      if (edge === "se") { w = W0 + dx; l = L0;      h = H0 + dy; t = T0; }
      if (edge === "sw") { w = W0 - dx; l = R0 - w;  h = H0 + dy; t = T0; }
      if (edge === "ne") { w = W0 + dx; l = L0;      h = H0 - dy; t = B0 - h; }
      if (edge === "nw") { w = W0 - dx; l = R0 - w;  h = H0 - dy; t = B0 - h; }

      // Clamp width
      if (w < MIN_W) {
        w = MIN_W;
        // For west edges, keep right pinned
        if (edge === "w" || edge === "sw" || edge === "nw") l = R0 - MIN_W;
      }
      // Clamp height
      if (h < MIN_H) {
        h = MIN_H;
        // For north edges, keep bottom pinned
        if (edge === "n" || edge === "ne" || edge === "nw") t = B0 - MIN_H;
      }
      // Don't go off-screen left
      if (l < 0) { w = Math.max(MIN_W, w + l); l = 0; }
      // Don't go off-screen top
      if (t < 0) { h = Math.max(MIN_H, h + t); t = 0; }

      el.style.width  = w + "px";
      el.style.height = h + "px";
      el.style.left   = l + "px";
      el.style.top    = t + "px";
    }

    function onUp() {
      document.body.style.userSelect = saved;
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseup",   onUp,   true);
    }

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseup",   onUp,   true);
  }

  const handleSend = () => {
    const text = chatValue.trim();
    if (!text || isProcessing) return;
    setChatValue("");
    if (chatInputRef.current) chatInputRef.current.style.height = "auto";
    onFollowUp(text);
  };

  return (
    <div
      ref={elRef}
      id="bk-output"
      style={{ position: "fixed" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Resize handles */}
      <div className="bk-resize bk-resize-n"  onMouseDown={(e) => onResizeMouseDown(e, "n")}  />
      <div className="bk-resize bk-resize-s"  onMouseDown={(e) => onResizeMouseDown(e, "s")}  />
      <div className="bk-resize bk-resize-e"  onMouseDown={(e) => onResizeMouseDown(e, "e")}  />
      <div className="bk-resize bk-resize-w"  onMouseDown={(e) => onResizeMouseDown(e, "w")}  />
      <div className="bk-resize bk-resize-ne" onMouseDown={(e) => onResizeMouseDown(e, "ne")} />
      <div className="bk-resize bk-resize-nw" onMouseDown={(e) => onResizeMouseDown(e, "nw")} />
      <div className="bk-resize bk-resize-se" onMouseDown={(e) => onResizeMouseDown(e, "se")} />
      <div className="bk-resize bk-resize-sw" onMouseDown={(e) => onResizeMouseDown(e, "sw")} />

      {/* Header */}
      <div id="bk-out-header" onMouseDown={onHandleMouseDown}>
        <div id="bk-out-logo">⚡</div>
        <div id="bk-out-title">BlinkAI</div>
        <div id="bk-out-model-tag">{MODELS[activeModelIdx].label}</div>
        <button id="bk-out-close" title="Close" onClick={onClose}>✕</button>
      </div>

      {/* Body */}
      <div id="bk-out-body" ref={bodyRef}>
        {messages.map((msg) => (
          <Message
            key={msg.id}
            role={msg.role}
            text={msg.text}
            isError={msg.isError}
            isNew={newMsgIds.has(msg.id)}
            onSwitchModel={onSwitchModel}
          />
        ))}
      </div>

      {/* Footer */}
      <div id="bk-footer">
        <textarea
          ref={chatInputRef}
          id="bk-chat-input"
          placeholder={isProcessing ? "Thinking…" : "Continue the conversation…"}
          rows={1}
          value={chatValue}
          disabled={isProcessing}
          onChange={(e) => {
            setChatValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />

        {/* Model switcher in footer */}
        <div id="bk-footer-model" style={{ position: "relative" }}>
          <button
            id="bk-model-toggle"
            title="Switch model"
            onClick={() => setShowModelMenu((v) => !v)}
          >
            <span id="bk-model-toggle-label">{MODELS[activeModelIdx].label}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: "4px", flexShrink: 0 }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {showModelMenu && (
            <div id="bk-footer-model-menu" onMouseDown={(e) => e.stopPropagation()}>
              {MODELS.map((m, i) => (
                <div
                  key={m.id}
                  className={`bk-fmenu-item ${i === activeModelIdx ? "active" : ""}`}
                  onClick={() => {
                    onModelChange(i);
                    chrome.storage.local.set({ selectedModel: m.id });
                    setShowModelMenu(false);
                  }}
                >
                  {m.label}
                  {i === activeModelIdx && <span className="bk-fmenu-check">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          id="bk-send-btn"
          className={isProcessing ? "bk-busy" : ""}
          onClick={handleSend}
          disabled={isProcessing}
        >
          <SendIcon />
        </button>
      </div>

      <div className="bk-resize-grip" aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M9 1L1 9M9 5L5 9" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}
