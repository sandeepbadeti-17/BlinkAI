// background.js - BlinkAI v3 service worker
// ⚠️  Replace the API key below with your own Gemini key before publishing.
const API_KEY = "your-gemini-api-key";

const MODEL_URLS = {
  "gemini-3-flash-preview":        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
  "gemini-3.1-flash-lite-preview": "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
};

const DEFAULT_MODEL = "gemini-3-flash-preview";

// ─── Message router ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.greeting === "hello") {
    sendResponse({ farewell: "goodbye" });
    return;
  }

  if (message.type === "BLINK_SUMMARY") {
    const modelId = message.model || DEFAULT_MODEL;
    const apiUrl  = MODEL_URLS[modelId] || MODEL_URLS[DEFAULT_MODEL];

    handleBlink(message.payload, apiUrl)
      .then(result => {
        console.log("✅ Sending response:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("❌ Error in handleBlink:", error);
        sendResponse({ summary: "⚠️ Network error. Try again." });
      });

    return true; // keep channel open for async response
  }
});

// ─── Core API call ────────────────────────────────────────────────────────────
async function handleBlink(text, apiUrl) {
  if (!text || text.trim().length === 0) {
    return { summary: "⚠️ No text selected." };
  }

  console.log("🔄 BlinkAI processing with:", apiUrl);

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    console.log("📡 API Status:", response.status);

    if (!response.ok) {
      return handleApiError(response);
    }

    const data = await response.json();
    console.log("✅ API Response:", data);
    return parseApiResponse(data);

  } catch (err) {
    console.error("❌ Network/Fetch Error:", err);
    return { summary: "⚠️ Network error. Check your connection.", error: true };
  }
}

// ─── Error handling ───────────────────────────────────────────────────────────
async function handleApiError(response) {
  const errorData = await response.json().catch(() => ({}));
  console.error("❌ API Error:", response.status, errorData);

  const errors = {
    429: "⚠️ Rate limited. Wait 30 seconds and try again.",
    403: "⚠️ Invalid API key. Contact developer.",
    404: "⚠️ Model not found. Try switching the model.",
    400: "⚠️ Bad request. Try shorter text or switch the model.",
  };

  return {
    summary: errors[response.status] ?? `⚠️ Error ${response.status}. Try switching the model.`,
    error: true,
  };
}

// ─── Response parsing ─────────────────────────────────────────────────────────
function parseApiResponse(data) {
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    console.error("❌ Unexpected response structure:", data);
    return { summary: "⚠️ Empty response from API. Try switching the model.", error: true };
  }

  const summary = raw
    .replace(/\*\*/g, "")
    .replace(/\*/g,   "")
    .replace(/#+\s/g, "")
    .replace(/\n+/g,  " ")
    .trim();

  return { summary };
}
