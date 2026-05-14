// src/hooks/useDraggable.js
import { useRef, useCallback } from "react";

export function useDraggable() {
  const elRef = useRef(null);

  const onHandleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = elRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const originLeft = rect.left;
    const originTop = rect.top;

    e.preventDefault();

    const onMove = (e2) => {
      el.style.left =
        Math.max(0, Math.min(window.innerWidth - el.offsetWidth, originLeft + e2.clientX - startX)) + "px";
      el.style.top =
        Math.max(0, Math.min(window.innerHeight - el.offsetHeight, originTop + e2.clientY - startY)) + "px";
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return { elRef, onHandleMouseDown };
}
