// background.js — BlinkAI service worker (streaming via streamGenerateContent)

const MODEL_URLS = {
  "gemini-3-flash-preview":
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent",
  "gemini-3.1-flash-lite-preview":
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent",
};

const DEFAULT_MODEL = "gemini-3-flash-preview";

// ── Non-streaming message router (ping only) ───────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.greeting === "hello") {
    sendResponse({ farewell: "goodbye" });
    return false;
  }
});

// ── Streaming via long-lived port ──────────────────────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "blink-stream") return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== "START_STREAM") return;

    const { payload, model } = msg;

    // Fetch API key
    const { apiKey } = await chrome.storage.local.get("apiKey");
    if (!apiKey) {
      port.postMessage({ type: "ERROR", text: "⚠️ No API key set. Click the BlinkAI icon to add your Gemini key." });
      return;
    }

    if (!payload || !payload.trim()) {
      port.postMessage({ type: "ERROR", text: "⚠️ No text to process." });
      return;
    }

    const url = MODEL_URLS[model] || MODEL_URLS[DEFAULT_MODEL];

    let response;
    try {
      response = await fetch(`${url}?key=${apiKey}&alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: payload }] }],
          generationConfig: { temperature: 0.7 },
        }),
      });
    } catch (err) {
      port.postMessage({ type: "ERROR", text: "⚠️ Network error. Check your connection." });
      return;
    }

    if (!response.ok) {
      const errorMap = {
        429: "⚠️ Rate limited — wait 30s and try again.",
        403: "⚠️ Invalid API key. Update it in the extension popup.",
        404: "⚠️ Model not found. Try switching the model.",
        400: "⚠️ Bad request. Try shorter text.",
      };
      port.postMessage({
        type: "ERROR",
        text: errorMap[response.status] || `⚠️ API error ${response.status}.`,
      });
      return;
    }

    // Read the SSE stream chunk by chunk
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by "\n\n"; each starts with "data: "
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.slice(5).trim(); // strip "data: "
          if (jsonStr === "[DONE]") continue;

          let parsed;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            continue; // skip malformed lines
          }

          const raw = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!raw) continue;

          // Strip markdown decorators
          const clean = raw
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/#+\s/g, "");

          port.postMessage({ type: "CHUNK", text: clean });
        }
      }
    } catch (err) {
      port.postMessage({ type: "ERROR", text: "⚠️ Stream interrupted." });
      return;
    }

    port.postMessage({ type: "DONE" });
  });
});