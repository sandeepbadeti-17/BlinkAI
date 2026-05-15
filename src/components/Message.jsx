// src/components/Message.jsx
import { useEffect, useState, useRef } from "react";

// Renders text with proper line breaks and a typewriter effect
function TypewriterText({ text, animate }) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);
  const rafRef = useRef(null);
  const idxRef = useRef(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setDisplayed(text);
      idxRef.current = text.length;
      return;
    }

    // Cancel any running animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const CHARS_PER_FRAME = 3; // speed: chars revealed per frame (~60fps)

    function tick() {
      idxRef.current = Math.min(idxRef.current + CHARS_PER_FRAME, text.length);
      setDisplayed(text.slice(0, idxRef.current));
      if (idxRef.current < text.length) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [text, animate]);

  // Split on newlines and render <br> properly
  const lines = displayed.split("\n");

  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

export function Message({ role, text, isError, isNew, onSwitchModel }) {
  const isPlaceholder = text === "…";

  return (
    <div className={`bk-msg bk-${role}`}>
      <div className="bk-msg-label">{role === "user" ? "You" : "BlinkAI"}</div>
      <div className={`bk-bubble ${isError ? "bk-error" : ""}`}>
        {isPlaceholder ? (
          <div className="bk-thinking">
            <div className="bk-dot" />
            <div className="bk-dot" />
            <div className="bk-dot" />
          </div>
        ) : (
          <TypewriterText text={text} animate={role === "ai" && isNew && !isError} />
        )}
        {isError && (
          <>
            <br />
            <span className="bk-switch-hint" onClick={onSwitchModel}>
              Switch model and retry ↗
            </span>
          </>
        )}
      </div>
    </div>
  );
}
