// src/components/Message.jsx

export function Message({ role, text, isError, isProcessing, onSwitchModel }) {
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
        ) : text}
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
