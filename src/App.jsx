// src/App.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { MiniPill } from "./components/MiniPill";
import { Toolbar } from "./components/Toolbar";
import { OutputPanel } from "./components/OutputPanel";
import { useBlinkAI } from "./hooks/useBlinkAI";
import { MIN_WORDS, MAX_WORDS } from "./lib/constants";

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function App() {
  const [pillPos, setPillPos]       = useState(null);
  const [toolbarPos, setToolbarPos] = useState(null);
  const [showOutput, setShowOutput] = useState(false);
  const [selection, setSelection]   = useState("");
  const [enabled, setEnabled]       = useState(true);

  const scrollListenersRef = useRef([]);

  const {
    messages, isProcessing, activeModelIdx,
    switchModel, switchModelAndRetry, setActiveModelIdx,
    doRequest, doInstantExplain, doFollowUp,
    resetConversation, newMsgIds, MODELS,
  } = useBlinkAI();

  useEffect(() => {
    chrome.storage.local.get("blinkEnabled", (data) => {
      setEnabled(data.blinkEnabled !== false);
    });
    const listener = (changes) => {
      if ("blinkEnabled" in changes) setEnabled(changes.blinkEnabled.newValue !== false);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  function cleanupScrollListeners() {
    for (const { el, type, fn, capture } of scrollListenersRef.current) {
      try { el.removeEventListener(type, fn, { capture }); } catch (_) {}
    }
    scrollListenersRef.current = [];
  }

  useEffect(() => {
    const handleMouseUp = (e) => {
      if (!enabled) return;
      const inUI = !!e.target.closest?.("#blinkai-mount");
      if (inUI) return;
      setTimeout(() => {
        const sel = window.getSelection()?.toString().trim() || "";
        const wc  = countWords(sel);
        if (sel && wc >= MIN_WORDS && wc <= MAX_WORDS) {
          setSelection(sel);
          setPillPos({ x: e.clientX + 8, y: e.clientY + 14 });
          setToolbarPos(null);

          cleanupScrollListeners();
          const handleScroll = () => { setPillPos(null); setToolbarPos(null); };

          // Attach to window, document, and all scrollable ancestors
          window.addEventListener("scroll",   handleScroll, { passive: true, capture: true });
          window.addEventListener("wheel",    handleScroll, { passive: true });
          document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
          scrollListenersRef.current.push(
            { el: window,   type: "scroll", fn: handleScroll, capture: true  },
            { el: window,   type: "wheel",  fn: handleScroll, capture: false },
            { el: document, type: "scroll", fn: handleScroll, capture: true  },
          );

          // Walk DOM for overflow:scroll containers
          let node = e.target;
          while (node && node !== document.documentElement) {
            try {
              const ov = window.getComputedStyle(node).overflowY;
              if (ov === "auto" || ov === "scroll") {
                node.addEventListener("scroll", handleScroll, { passive: true });
                scrollListenersRef.current.push({ el: node, type: "scroll", fn: handleScroll, capture: false });
              }
            } catch (_) {}
            node = node.parentElement;
          }
        }
      }, 10);
    };

    const handleMouseDown = (e) => {
      const inUI = !!e.target.closest?.("#blinkai-mount");
      if (inUI) return;
      const hasSel = window.getSelection()?.toString().trim();
      if (!hasSel) { setPillPos(null); setToolbarPos(null); cleanupScrollListeners(); }
    };

    const handleSelectionChange = () => {
      const sel = window.getSelection()?.toString().trim();
      if (!sel) {
        // Only dismiss the floating pill — toolbar stays open if user opened it
        setPillPos(null);
        cleanupScrollListeners();
      }
    };

    document.addEventListener("mouseup",        handleMouseUp);
    document.addEventListener("mousedown",       handleMouseDown);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mouseup",        handleMouseUp);
      document.removeEventListener("mousedown",       handleMouseDown);
      document.removeEventListener("selectionchange", handleSelectionChange);
      cleanupScrollListeners();
    };
  }, [enabled]);

  const handleInstant = useCallback(() => {
    if (!selection) return;
    setPillPos(null); setToolbarPos(null); cleanupScrollListeners();
    resetConversation(); setShowOutput(true);
    doInstantExplain(selection);
  }, [selection, doInstantExplain, resetConversation]);

  const handleAsk = useCallback(() => {
    if (!selection || !pillPos) return;
    setToolbarPos({ x: pillPos.x, y: pillPos.y + 8 });
    setPillPos(null); cleanupScrollListeners();
  }, [selection, pillPos]);

  const handleRequest = useCallback((customPrompt, prefix) => {
    if (!selection) return;
    setToolbarPos(null); setPillPos(null); cleanupScrollListeners();
    resetConversation(); setShowOutput(true);
    doRequest(selection, customPrompt, prefix);
  }, [selection, doRequest, resetConversation]);

  const handleClose = useCallback(() => {
    setShowOutput(false); resetConversation();
  }, [resetConversation]);

  return (
    <>
      {pillPos && !toolbarPos && (
        <MiniPill x={pillPos.x} y={pillPos.y} onInstant={handleInstant} onAsk={handleAsk} />
      )}
      {toolbarPos && (
        <Toolbar
          x={toolbarPos.x} y={toolbarPos.y}
          onRequest={handleRequest}
          activeModelIdx={activeModelIdx}
          onModelChange={setActiveModelIdx}
        />
      )}
      {showOutput && (
        <OutputPanel
          messages={messages}
          isProcessing={isProcessing}
          activeModelIdx={activeModelIdx}
          newMsgIds={newMsgIds}
          onFollowUp={doFollowUp}
          onSwitchModel={switchModelAndRetry}
          onModelChange={setActiveModelIdx}
          onClose={handleClose}
        />
      )}
    </>
  );
}
