// src/components/Toolbar.jsx
import { useState, useRef, useEffect } from "react";
import { PRESETS, MODELS } from "../lib/constants";
import { SendIcon } from "./SendIcon";

export function Toolbar({ x, y, onRequest, activeModelIdx, onModelChange }) {
  const [promptValue, setPromptValue]   = useState("");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const textareaRef = useRef(null);
  const toolbarRef  = useRef(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Clamp to viewport
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.right  > window.innerWidth  - 8) el.style.left = window.innerWidth  - el.offsetWidth  - 8 + "px";
      if (r.bottom > window.innerHeight - 8) el.style.top  = window.innerHeight - el.offsetHeight - 8 + "px";
      if (r.top  < 8) el.style.top  = "8px";
      if (r.left < 8) el.style.left = "8px";
    });
  }, []);

  const handleSend = () => {
    const val = promptValue.trim();
    onRequest(val || null, null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape") setShowModelMenu(false);
  };

  return (
    <div
      ref={toolbarRef}
      className="bk-toolbar"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Row 1: badge + model pill ── */}
      <div className="bk-toolbar-top">
        <div className="bk-badge">
          <span className="bk-badge-icon">⚡</span>
          BlinkAI
        </div>

        <div
          className="bk-model-pill"
          onClick={(e) => { e.stopPropagation(); setShowModelMenu((v) => !v); }}
        >
          <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
            <circle cx="4" cy="4" r="3" stroke="rgba(255,195,40,0.5)" strokeWidth="1.2"/>
            <circle cx="4" cy="4" r="1.2" fill="rgba(255,195,40,0.8)"/>
          </svg>
          <span>{MODELS[activeModelIdx].label}</span>
          <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
            <path d="M1 1L3.5 3.5L6 1" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Model dropdown */}
        {showModelMenu && (
          <div className="bk-model-menu bk-model-menu--toolbar">
            {MODELS.map((m, i) => (
              <div
                key={m.id}
                className={`bk-model-item ${i === activeModelIdx ? "active" : ""}`}
                onClick={(e) => { e.stopPropagation(); onModelChange(i); setShowModelMenu(false); }}
              >
                {m.label}
                {i === activeModelIdx && <span className="bk-model-check">✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Row 2: text input ── */}
      <div className="bk-input-row">
        <textarea
          ref={textareaRef}
          className="bk-prompt-input"
          placeholder="Ask anything about the selection…"
          rows={1}
          value={promptValue}
          onChange={(e) => {
            setPromptValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          className={`bk-toolbar-send ${promptValue.trim() ? "active" : ""}`}
          title="Send (Enter)"
          onClick={handleSend}
        >
          <SendIcon />
        </button>
      </div>

      {/* ── Row 3: preset chips ── */}
      <div className="bk-quick-actions">
        {PRESETS.slice(0, 3).map((p) => (
          <button
            key={p.label}
            className="bk-quick-btn"
            onClick={() => onRequest(null, p.prefix)}
          >
            <span className="bk-quick-icon">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
