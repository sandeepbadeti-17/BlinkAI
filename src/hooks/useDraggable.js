// src/hooks/useDraggable.js
import { useRef, useCallback } from "react";

export function useDraggable() {
  const elRef = useRef(null);

  const onHandleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = elRef.current;
    if (!el) return;
    e.preventDefault();

    // Use BCR for real viewport position — style.left/top may be empty
    const rect   = el.getBoundingClientRect();
    const origL  = rect.left;
    const origT  = rect.top;
    const startX = e.clientX;
    const startY = e.clientY;

    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const onMove = (ev) => {
      const newL = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  origL + ev.clientX - startX));
      const newT = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, origT + ev.clientY - startY));
      el.style.left = newL + "px";
      el.style.top  = newT + "px";
    };

    const onUp = () => {
      document.body.style.userSelect = prevSelect;
      document.removeEventListener("mousemove", onMove, { capture: true });
      document.removeEventListener("mouseup",   onUp,   { capture: true });
    };

    document.addEventListener("mousemove", onMove, { capture: true });
    document.addEventListener("mouseup",   onUp,   { capture: true });
  }, []);

  return { elRef, onHandleMouseDown };
}
