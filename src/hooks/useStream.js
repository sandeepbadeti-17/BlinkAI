// src/hooks/useStream.js
import { useState, useRef, useCallback } from "react";

export function useStream() {
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const portRef = useRef(null);

  const startStream = useCallback((payload, model, onChunk, onDone, onError) => {
    // Disconnect any existing port
    if (portRef.current) {
      try { portRef.current.disconnect(); } catch (_) {}
    }

    setStreamingText("");
    setIsStreaming(true);

    const port = chrome.runtime.connect({ name: "blink-stream" });
    portRef.current = port;

    let accumulated = "";

    port.onMessage.addListener((msg) => {
      if (msg.type === "CHUNK") {
        accumulated += msg.text;
        setStreamingText(accumulated);
        onChunk?.(accumulated);
      } else if (msg.type === "ERROR") {
        setIsStreaming(false);
        onError?.(msg.text);
        port.disconnect();
      } else if (msg.type === "DONE") {
        setIsStreaming(false);
        onDone?.(accumulated);
        port.disconnect();
      }
    });

    port.onDisconnect.addListener(() => {
      setIsStreaming(false);
    });

    port.postMessage({ type: "START_STREAM", payload, model });
  }, []);

  const cancelStream = useCallback(() => {
    if (portRef.current) {
      try { portRef.current.disconnect(); } catch (_) {}
      portRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return { streamingText, isStreaming, startStream, cancelStream };
}
