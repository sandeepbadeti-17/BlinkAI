// background.js
const API_KEY = "YOUR_API_KEY";

const MODEL_URLS = {
  "gemini-3-flash-preview":       "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
  "gemini-3.1-flash-lite-preview":"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
};

// fallback if content.js sends an unrecognized model id
const DEFAULT_MODEL = "gemini-3-flash-preview";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.greeting === "hello") {
    sendResponse({ farewell: "goodbye" });
    return;
  }

  if (message.type === "BLINK_SUMMARY") {
    const modelId  = message.model || DEFAULT_MODEL;
    const apiUrl   = MODEL_URLS[modelId] || MODEL_URLS[DEFAULT_MODEL];

    handleBlink(message.payload, apiUrl)
      .then(result => {
        console.log("✅ Sending response:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("❌ Error in handleBlink:", error);
        sendResponse({ summary: "⚠️ Network error. Try again." });
      });

    return true; // keep channel open for async
  }
});

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
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${text}` }] }],
        generationConfig: { temperature: 0.7 }
      })
    });

    console.log("📡 API Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ API Error:", response.status, errorData);

      if (response.status === 429) return { summary: "⚠️ Rate limited. Wait 30 seconds and try again.", error: true };
      if (response.status === 403) return { summary: "⚠️ Invalid API key. Contact developer.", error: true };
      if (response.status === 404) return { summary: "⚠️ Model not found. Try switching the model.", error: true };
      if (response.status === 400) return { summary: "⚠️ Bad request. Try shorter text or switch the model.", error: true };
      return { summary: `⚠️ Error ${response.status}. Try switching the model.`, error: true };
    }

    const data = await response.json();
    console.log("✅ API Response:", data);

    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      let summary = data.candidates[0].content.parts[0].text;
      summary = summary
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/#+\s/g, "")
        .replace(/\n+/g, " ")
        .trim();
      return { summary };
    }

    console.error("❌ Unexpected response structure:", data);
    return { summary: "⚠️ Empty response from API. Try switching the model.", error: true };

  } catch (err) {
    console.error("❌ Network/Fetch Error:", err);
    return { summary: "⚠️ Network error. Check your connection.", error: true };
  }
}