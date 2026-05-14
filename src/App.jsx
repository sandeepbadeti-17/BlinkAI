// src/App.jsx
import { useState, useEffect, useCallback } from "react";
import { MiniPill } from "./components/MiniPill";
import { Toolbar } from "./components/Toolbar";
import { OutputPanel } from "./components/OutputPanel";
import { useBlinkAI } from "./hooks/useBlinkAI";
import { MIN_WORDS, MAX_WORDS } from "./lib/constants";

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function App() {
  // pill: {x, y} | null  — tiny ⚡ Ask buttons right after selection
  const [pillPos, setPillPos] = useState(null);
  // toolbar: {x, y} | null — full "Ask" panel
  const [toolbarPos, setToolbarPos] = useState(null);
  const [showOutput, setShowOutput] = useState(false);
  const [selection, setSelection] = useState("");

  const {
    messages,
    isStreaming,
    activeModelIdx,
    switchModel,
    setActiveModelIdx,
    doRequest,
    doInstantExplain,
    doFollowUp,
    resetConversation,
  } = useBlinkAI();

  useEffect(() => {
    const handleMouseUp = (e) => {
      // Ignore clicks inside our own UI
      const inUI =
        e.target.closest?.("#blinkai-mount") !== null &&
        e.target.closest?.("#blinkai-mount") !== undefined;
      if (inUI) return;

      // Small delay so browser can finalize selection
      setTimeout(() => {
        const sel = window.getSelection()?.toString().trim() || "";
        const wc = countWords(sel);

        if (sel && wc >= MIN_WORDS && wc <= MAX_WORDS) {
          setSelection(sel);
          // Show pill slightly below + right of cursor
          setPillPos({ x: e.clientX + 8, y: e.clientY + 14 });
          setToolbarPos(null);
        }
        // If no selection, pill is dismissed by mousedown handler below
      }, 10);
    };

    const handleMouseDown = (e) => {
      const inUI =
        e.target.closest?.("#blinkai-mount") !== null &&
        e.target.closest?.("#blinkai-mount") !== undefined;
      if (inUI) return;

      // If clicking outside while pill or toolbar is shown — dismiss
      // But don't clear selection so user can still copy
      const hasSel = window.getSelection()?.toString().trim();
      if (!hasSel) {
        setPillPos(null);
        setToolbarPos(null);
      }
    };

    // Scroll immediately hides pill + toolbar (but not output panel)
    const handleScroll = () => {
      setPillPos(null);
      setToolbarPos(null);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("scroll", handleScroll, { passive: true });
    // Also listen on window to catch scrolls in all contexts (including
    // scrollable divs and cases where document scroll doesn't fire)
    window.addEventListener("scroll", handleScroll, { passive: true });
    // wheel fires before scroll, so trackpad/mouse-wheel dismisses instantly
    window.addEventListener("wheel", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleScroll);
    };
  }, []);

  // ⚡ Instant explain
  const handleInstant = useCallback(() => {
    if (!selection) return;
    setPillPos(null);
    setToolbarPos(null);
    resetConversation();
    setShowOutput(true);
    doInstantExplain(selection);
  }, [selection, doInstantExplain, resetConversation]);

  // Ask → open toolbar
  const handleAsk = useCallback(() => {
    if (!selection || !pillPos) return;
    setToolbarPos({ x: pillPos.x, y: pillPos.y + 8 });
    setPillPos(null);
  }, [selection, pillPos]);

  // Toolbar sends a request
  const handleRequest = useCallback(
    (customPrompt, prefix) => {
      if (!selection) return;
      setToolbarPos(null);
      setPillPos(null);
      resetConversation();
      setShowOutput(true);
      doRequest(selection, customPrompt, prefix);
    },
    [selection, doRequest, resetConversation]
  );

  const handleClose = useCallback(() => {
    setShowOutput(false);
    resetConversation();
  }, [resetConversation]);

  return (
    <>
      {/* Tiny pill — appears right after selection */}
      {pillPos && !toolbarPos && (
        <MiniPill
          x={pillPos.x}
          y={pillPos.y}
          onInstant={handleInstant}
          onAsk={handleAsk}
        />
      )}

      {/* Full Ask toolbar */}
      {toolbarPos && (
        <Toolbar
          x={toolbarPos.x}
          y={toolbarPos.y}
          onRequest={handleRequest}
          activeModelIdx={activeModelIdx}
          onModelChange={setActiveModelIdx}
        />
      )}

      {/* Output panel */}
      {showOutput && (
        <OutputPanel
          messages={messages}
          isStreaming={isStreaming}
          activeModelIdx={activeModelIdx}
          onFollowUp={doFollowUp}
          onSwitchModel={switchModel}
          onClose={handleClose}
        />
      )}
    </>
  );
}
