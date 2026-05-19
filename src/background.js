// background.js — BlinkAI service worker

const MODEL_URLS = {
  "gemini-3-flash-preview":
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
  "gemini-3.1-flash-lite":
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
};
const DEFAULT_MODEL = "gemini-3.1-flash-lite";

// ── Message router ─────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.greeting === "hello") { sendResponse({ farewell: "goodbye" }); return false; }
  if (message.type === "BLINK_REQUEST") {
    handleRequest(message.payload, message.model)
      .then(sendResponse)
      .catch(() => sendResponse({ text: "⚠️ Network error. Try again.", error: true }));
    return true;
  }
});

// ── PDF support ────────────────────────────────────────────────────────────────
//
// How Chrome handles PDFs:
//   1. http(s)://example.com/file.pdf  → Chrome intercepts, opens its built-in
//      PDF viewer (chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/...)
//      Content scripts CANNOT run inside chrome-extension:// pages.
//
//   2. file:///path/to/file.pdf        → Same built-in viewer, same problem.
//
// Solution: use the declarativeNetRequest or webRequest API to redirect PDF
// URLs to Google Docs viewer (https://docs.google.com/viewer?url=<pdf-url>)
// which renders PDFs as HTML — our content script CAN run there and text
// IS selectable.
//
// For file:// PDFs (can't send to Google Docs), we inject a small overlay
// that tells the user to open the PDF from a URL.
//
// We only redirect when BlinkAI is enabled and the URL is a direct PDF.

const GDOCS_VIEWER = "https://docs.google.com/viewer?url=";

// Track tabs we've already redirected so we don't loop
const redirectedTabs = new Set();

function isPdfUrl(url) {
  if (!url) return false;
  // Skip our own redirect target and chrome-internal pages
  if (url.startsWith("chrome") || url.startsWith(GDOCS_VIEWER)) return false;
  try {
    const u = new URL(url);
    if (u.pathname.toLowerCase().endsWith(".pdf")) return true;
    // query string with .pdf (e.g. ?file=report.pdf)
    if (u.search.toLowerCase().includes(".pdf"))   return true;
  } catch (_) {}
  return false;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const url = tab.url || "";
  if (!isPdfUrl(url)) return;
  if (redirectedTabs.has(tabId)) { redirectedTabs.delete(tabId); return; }

  const data = await chrome.storage.local.get("blinkEnabled");
  if (data.blinkEnabled === false) return;

  if (url.startsWith("file://")) {
    // Can't redirect file:// to Google Docs — inject a notice overlay instead
    chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      func: () => {
        if (document.getElementById("blinkai-pdf-notice")) return;
        const el = document.createElement("div");
        el.id = "blinkai-pdf-notice";
        el.style.cssText = [
          "position:fixed", "bottom:20px", "right:20px", "z-index:2147483647",
          "background:#1a1a1a", "color:#f0f0f0", "border:1px solid rgba(255,195,40,0.4)",
          "border-radius:10px", "padding:12px 16px", "font:500 13px/1.5 system-ui",
          "box-shadow:0 4px 20px rgba(0,0,0,0.5)", "max-width:280px",
        ].join(";");
        el.innerHTML = `
          <div style="color:#ffc328;font-weight:700;margin-bottom:4px">⚡ BlinkAI — PDF tip</div>
          <div style="color:rgba(255,255,255,0.6);font-size:12px">
            For local PDFs, text selection works best when opened via a URL
            (drag to Chrome or use a local server). <br><br>
            Select any visible text above and BlinkAI will activate.
          </div>
          <div style="text-align:right;margin-top:8px">
            <button onclick="this.closest('#blinkai-pdf-notice').remove()"
              style="background:transparent;border:1px solid rgba(255,255,255,0.15);
              border-radius:6px;color:rgba(255,255,255,0.5);font-size:11px;
              padding:3px 8px;cursor:pointer">Dismiss</button>
          </div>`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 8000);
      },
    }).catch(() => {});
    return;
  }

  // For http(s):// PDF URLs — redirect to Google Docs Viewer
  // Google Docs Viewer renders PDFs as HTML with a selectable text layer.
  redirectedTabs.add(tabId);
  const viewerUrl = GDOCS_VIEWER + encodeURIComponent(url);
  chrome.tabs.update(tabId, { url: viewerUrl });
});

// ── Core API call ──────────────────────────────────────────────────────────────
async function handleRequest(text, modelId) {
  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) {
    return { text: "⚠️ No API key set. Click the BlinkAI icon in your toolbar to add your Gemini key.", error: true };
  }
  if (!text || !text.trim()) {
    return { text: "⚠️ No text to process.", error: true };
  }

  const url = MODEL_URLS[modelId] || MODEL_URLS[DEFAULT_MODEL];

  try {
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    if (!response.ok) {
      const errorMap = {
        429: "⚠️ Rate limited — switch model and retry.",
        403: "⚠️ Invalid API key. Update it in the extension popup.",
        404: "⚠️ Model not found. Try switching the model.",
        400: "⚠️ Bad request. Try shorter text.",
      };
      return {
        text: errorMap[response.status] || `⚠️ API error ${response.status}.`,
        error: true,
        isRateLimit: response.status === 429,
      };
    }

    const data  = await response.json();
    const raw   = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return { text: "⚠️ Empty response from API.", error: true };

    const clean = raw.replace(/\*\*/g, "").replace(/\*/g, "").replace(/#+\s/g, "").trim();
    return { text: clean, error: false };
  } catch (err) {
    console.error("❌ Fetch error:", err);
    return { text: "⚠️ Network error. Check your connection.", error: true };
  }
}
