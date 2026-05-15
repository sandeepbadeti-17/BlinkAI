// src/components/Toolbar.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { PRESETS, MODELS } from "../lib/constants";
import { SendIcon } from "./SendIcon";

export function Toolbar({ x, y, onRequest, activeModelIdx, onModelChange }) {
  const [promptValue, setPromptValue]     = useState("");
  const [showModelMenu, setShowModelMenu] = useState(false);
  const textareaRef  = useRef(null);
  const toolbarRef   = useRef(null);

  // ── Draggable state ────────────────────────────────────────────────
  const posRef   = useRef({ x, y });
  const dragRef  = useRef(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Set initial position
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    el.style.left = posRef.current.x + "px";
    el.style.top  = posRef.current.y + "px";
    // Clamp after paint
    requestAnimationFrame(() => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.right  > window.innerWidth  - 8) el.style.left = window.innerWidth  - el.offsetWidth  - 8 + "px";
      if (r.bottom > window.innerHeight - 8) el.style.top  = window.innerHeight - el.offsetHeight - 8 + "px";
      if (r.top  < 8) el.style.top  = "8px";
      if (r.left < 8) el.style.left = "8px";
    });
  }, []);

  // Close model menu on outside click
  useEffect(() => {
    if (!showModelMenu) return;
    const close = (e) => {
      if (!toolbarRef.current?.contains(e.target)) setShowModelMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showModelMenu]);

  // ── Drag handler — only the drag-handle triggers it ───────────────
  const onDragHandleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = toolbarRef.current;
    if (!el) return;
    const rect   = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const origL  = rect.left;
    const origT  = rect.top;
    e.preventDefault();

    const onMove = (ev) => {
      el.style.left = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  origL + ev.clientX - startX)) + "px";
      el.style.top  = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, origT + ev.clientY - startY)) + "px";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
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
      style={{ left: x, top: y, position: "fixed" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Drag handle bar ── */}
      <div className="bk-toolbar-drag" onMouseDown={onDragHandleMouseDown}>
        <div className="bk-toolbar-drag-dots" />
      </div>

      {/* ── Input box ── */}
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
            e.target.style.height = e.target.scrollHeight + "px";
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

      {/* ── Bottom bar: [Summarize] [Explain] [Key points]  ···  [model ▾] ── */}
      <div className="bk-toolbar-bottom">
        <div className="bk-quick-actions">
          {PRESETS.slice(0, 3).map((p) => (
            <button
              key={p.label}
              className="bk-quick-btn"
              onClick={() => onRequest(null, p.prefix)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Model pill — right side, opens upward */}
        <div className="bk-model-pill-wrap">
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

          {showModelMenu && (
            <div className="bk-model-menu bk-model-menu--up">
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
      </div>
    </div>
  );
}
