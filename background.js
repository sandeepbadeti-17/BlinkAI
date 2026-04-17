// background.js - Fixed Gemini API endpoint with proper async handling

const API_KEY = "YOUR_API_KEY"; // Store here, NOT in messages
// const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent"
// const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.greeting === "hello") {
    sendResponse({ farewell: "goodbye" });
    return;
  }
 
  if (message.type === "BLINK_SUMMARY") {
    // Handle async response properly
    handleBlink(message.payload)
      .then(result => {
        console.log("✅ Sending response:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("❌ Error in handleBlink:", error);
        sendResponse({ summary: "⚠️ Network error. Try again." });
      });
    
    // Return true to keep channel open for async response
    return true;
  }
});

async function handleBlink(text) {
  if (!text || text.trim().length === 0) {
    return { summary: "⚠️ No text selected." };
  }

  // console.log("🔄 BlinkAI processing text:", text.substring(0, 50) + "...");
  console.log("🔄 BlinkAI processing text:", text, "...");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${text}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          // maxOutputTokens: 300
        }
      })
    });

    console.log("📡 API Status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ API Error:", response.status, errorData);

      if (response.status === 429) {
        return { summary: "⚠️ Rate limited. Wait 30 seconds." };
      } else if (response.status === 403) {
        return { summary: "⚠️ Invalid API key. Contact developer." };
      } else if (response.status === 404) {
        return { summary: "⚠️ API endpoint not found. Check model name." };
      } else if (response.status === 400) {
        return { summary: "⚠️ Bad request. Try shorter text." };
      } else {
        return { summary: `⚠️ Error ${response.status}. Try again.` };
      }
    }

    const data = await response.json();
    console.log("✅ API Response:", data);

    // Safely extract the response
    if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      let summary = data.candidates[0].content.parts[0].text;

      // Clean up formatting
      summary = summary
        .replace(/\*\*/g, "")  // remove bold
        .replace(/\*/g, "")    // remove italics
        .replace(/#+\s/g, "")  // remove headings
        .replace(/\n+/g, " ")  // collapse newlines
        .trim();

      // Limit length
      // if (summary.length > 300) {
      //   summary = summary.substring(0, 297) + "...";
      // }

      return { summary };
    } else {
      console.error("❌ Unexpected response structure:", data);
      return { summary: "⚠️ Empty response from API." };
    }

  } catch (err) {
    console.error("❌ Network/Fetch Error:", err);
    return { summary: "⚠️ Network error. Check connection." };
  }
}
