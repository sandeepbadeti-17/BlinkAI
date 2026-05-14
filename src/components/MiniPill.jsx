// src/components/MiniPill.jsx
import { useEffect, useRef } from "react";

export function MiniPill({ x, y, onInstant, onAsk }) {
  const ref = useRef(null);

  // Clamp to viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth - 8)
        el.style.left = window.innerWidth - el.offsetWidth - 8 + "px";
      if (r.bottom > window.innerHeight - 8)
        el.style.top = window.innerHeight - el.offsetHeight - 8 + "px";
    });
  }, []);

  return (
    <div
      ref={ref}
      className="bk-mini-pill"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        className="bk-pill-btn bk-pill-instant"
        title="Instant explain"
        onClick={(e) => { e.stopPropagation(); onInstant(); }}
      >
        ⚡
      </button>
      <div className="bk-pill-divider" />
      <button
        className="bk-pill-btn bk-pill-ask"
        title="Ask anything"
        onClick={(e) => { e.stopPropagation(); onAsk(); }}
      >
        Ask
      </button>
    </div>
  );
}
