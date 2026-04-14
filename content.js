// content.js - UI with improved error handling and response display
console.log("✅ BlinkAI content script loaded");

// Verify background script is loaded
chrome.runtime.sendMessage({ greeting: "hello" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error("❌ Background script not loaded:", chrome.runtime.lastError);
  } else {
    console.log("✅ Background script ready:", response);
  }
});

let blinkIcon = null;
let popup = null;
let currentSelection = null;
let isProcessing = false;

function createPopup(x, y) {
  if (popup) popup.remove();

  popup = document.createElement("div");
  popup.id = "blinkai-popup";
  
  popup.style.position = "fixed";
  popup.style.left = x + "px";
  popup.style.top = y + "px";
  popup.style.background = "#1a1a1a";
  popup.style.color = "#ffffff";
  popup.style.padding = "14px 18px";
  popup.style.borderRadius = "10px";
  popup.style.maxWidth = "450px";
  popup.style.minWidth = "250px";
  popup.style.maxHeight = "500px";
  popup.style.overflowY = "auto";
  popup.style.fontSize = "14px";
  popup.style.lineHeight = "1.6";
  popup.style.zIndex = "2147483647";
  popup.style.boxShadow = "0 6px 20px rgba(0,0,0,0.5)";
  popup.style.border = "1px solid #404040";
  popup.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  popup.style.wordWrap = "break-word";
  popup.style.whiteSpace = "pre-wrap";
  popup.style.animation = "blinkFadeIn 0.2s ease-in";

  // Add close button
  const closeBtn = document.createElement("span");
  closeBtn.innerHTML = "✕";
  closeBtn.style.position = "absolute";
  closeBtn.style.right = "8px";
  closeBtn.style.top = "6px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontSize = "18px";
  closeBtn.style.color = "#888";
  closeBtn.style.transition = "color 0.2s";
  closeBtn.addEventListener("mouseenter", () => (closeBtn.style.color = "#fff"));
  closeBtn.addEventListener("mouseleave", () => (closeBtn.style.color = "#888"));
  closeBtn.addEventListener("click", hidePopup);
  popup.appendChild(closeBtn);

  popup.style.paddingRight = "32px";

  popup.addEventListener("mouseenter", () => {
    popup.style.boxShadow = "0 8px 24px rgba(0,0,0,0.6)";
  });

  popup.addEventListener("mouseleave", () => {
    popup.style.boxShadow = "0 6px 20px rgba(0,0,0,0.5)";
  });

  document.body.appendChild(popup);

  // Inject animation
  if (!document.querySelector("#blinkai-styles")) {
    const style = document.createElement("style");
    style.id = "blinkai-styles";
    style.textContent = `
      @keyframes blinkFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes blinkSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .blink-loading {
        display: inline-block;
        animation: blinkSpin 1s linear infinite;
      }
      #blinkai-popup::-webkit-scrollbar {
        width: 8px;
      }
      #blinkai-popup::-webkit-scrollbar-track {
        background: #2a2a2a;
        border-radius: 10px;
      }
      #blinkai-popup::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 10px;
      }
      #blinkai-popup::-webkit-scrollbar-thumb:hover {
        background: #777;
      }
    `;
    document.head.appendChild(style);
  }

  adjustPopupPosition();
}


function adjustPopupPosition() {
  if (!popup) return;

  const rect = popup.getBoundingClientRect();
  const offset = 15;

  if (rect.right > window.innerWidth) {
    popup.style.left = window.innerWidth - rect.width - offset + "px";
  }
  if (rect.bottom > window.innerHeight) {
    popup.style.top = window.innerHeight - rect.height - offset + "px";
  }
  if (rect.top < 0) {
    popup.style.top = offset + "px";
  }
  if (rect.left < 0) {
    popup.style.left = offset + "px";
  }
}

function createBlinkIcon() {
  blinkIcon = document.createElement("div");
  blinkIcon.id = "blinkai-icon";
  blinkIcon.innerHTML = "⚡ Blink";
  
  blinkIcon.style.position = "fixed"; // Changed to fixed for better positioning
  blinkIcon.style.background = "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)";
  blinkIcon.style.color = "#000";
  blinkIcon.style.padding = "9px 15px";
  blinkIcon.style.borderRadius = "8px";
  blinkIcon.style.cursor = "pointer";
  blinkIcon.style.zIndex = "2147483646";
  blinkIcon.style.boxShadow = "0 3px 10px rgba(0,0,0,0.3)";
  blinkIcon.style.display = "none";
  blinkIcon.style.fontSize = "13px";
  blinkIcon.style.fontWeight = "600";
  blinkIcon.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  blinkIcon.style.transition = "all 0.2s ease";
  blinkIcon.style.userSelect = "none";
  blinkIcon.style.whiteSpace = "nowrap";

  document.body.appendChild(blinkIcon);

  blinkIcon.addEventListener("mouseenter", () => {
    if (!isProcessing) {
      blinkIcon.style.transform = "scale(1.08)";
      blinkIcon.style.boxShadow = "0 5px 15px rgba(0,0,0,0.4)";
    }
  });

  blinkIcon.addEventListener("mouseleave", () => {
    blinkIcon.style.transform = "scale(1)";
    blinkIcon.style.boxShadow = "0 3px 10px rgba(0,0,0,0.3)";
  });

  blinkIcon.addEventListener("click", handleBlinkClick);
}

function handleBlinkClick(e) {
  e.stopPropagation();
  e.preventDefault();

  if (!currentSelection || isProcessing) return;

  isProcessing = true;
  blinkIcon.style.opacity = "0.6";
  blinkIcon.style.pointerEvents = "none";

  hideBlinkIcon();
  createPopup(e.clientX + 10, e.clientY + 10);

  const spinnerEmoji = document.createElement("span");
  spinnerEmoji.className = "blink-loading";
  spinnerEmoji.textContent = "⚡";
  
  popup.innerHTML = "";
  popup.appendChild(spinnerEmoji);
  popup.appendChild(document.createTextNode(" Processing..."));

  // console.log("📤 Sending request with text:", currentSelection.substring(0, 50) + "...");
  console.log("📤 Sending request with text:",currentSelection + "...");

  chrome.runtime.sendMessage(
    { type: "BLINK_SUMMARY", payload: currentSelection },
    (response) => {
      console.log("📥 Response received:", response);
      
      isProcessing = false;
      blinkIcon.style.opacity = "1";
      blinkIcon.style.pointerEvents = "auto";

      if (chrome.runtime.lastError) {
        console.error("❌ Runtime error:", chrome.runtime.lastError);
        if (popup) {
          popup.innerHTML = "";
          popup.appendChild(document.createTextNode("❌ " + chrome.runtime.lastError.message));
        }
        return;
      }

      if (!response) {
        console.error("❌ No response received");
        if (popup) {
          popup.innerHTML = "";
          popup.appendChild(document.createTextNode("⚠️ No response from extension"));
        }
        return;
      }

      if (popup) {
        popup.innerHTML = "";
        const text = response.summary || "⚠️ Empty response";
        
        // Create close button
        const closeBtn = document.createElement("span");
        closeBtn.innerHTML = "✕";
        closeBtn.style.position = "absolute";
        closeBtn.style.right = "8px";
        closeBtn.style.top = "6px";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.fontSize = "18px";
        closeBtn.style.color = "#888";
        closeBtn.style.transition = "color 0.2s";
        closeBtn.addEventListener("mouseenter", () => (closeBtn.style.color = "#fff"));
        closeBtn.addEventListener("mouseleave", () => (closeBtn.style.color = "#888"));
        closeBtn.addEventListener("click", hidePopup);
        popup.appendChild(closeBtn);

        // Add text content
        const textDiv = document.createElement("div");
        textDiv.style.paddingRight = "24px";
        textDiv.textContent = text;
        popup.appendChild(textDiv);

        // console.log("✅ Response displayed:", text.substring(0, 100));
        console.log("✅ Response displayed:", text);
      }
    }
  );
}

function showBlinkIcon(x, y) {
  if (!blinkIcon) createBlinkIcon();

  // Use clientX/Y relative positioning with window offset
  blinkIcon.style.left = x + "px";
  blinkIcon.style.top = (y - 40) + "px";
  blinkIcon.style.display = "block";

  adjustBlinkIconPosition();
}

function adjustBlinkIconPosition() {
  if (!blinkIcon) return;

  const rect = blinkIcon.getBoundingClientRect();
  const offset = 10;

  if (rect.right > window.innerWidth) {
    blinkIcon.style.left = window.innerWidth - rect.width - offset + "px";
  }
  if (rect.top < 0) {
    blinkIcon.style.top = offset + "px";
  }
  if (rect.bottom > window.innerHeight) {
    blinkIcon.style.top = window.innerHeight - rect.height - offset + "px";
  }
}

function hideBlinkIcon() {
  if (blinkIcon) blinkIcon.style.display = "none";
}

function hidePopup() {
  if (popup) {
    popup.style.animation = "blinkFadeIn 0.2s ease-out reverse";
    setTimeout(() => {
      if (popup) popup.remove();
      popup = null;
    }, 150);
  }
}

function countWords(text) {
  return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
}

// Main selection handler
document.addEventListener("mouseup", (e) => {
  // Don't trigger if clicking on extension UI
  if ((blinkIcon && blinkIcon.contains(e.target)) ||
      (popup && popup.contains(e.target))) {
    return;
  }

  const selectedText = window.getSelection().toString().trim();
  const wordCount = countWords(selectedText);

  console.log("📍 Selection detected:", wordCount, "words");

  // Show icon only if selection is within reasonable range
  if (selectedText && wordCount >= 3 && wordCount <= 300) {
    currentSelection = selectedText;
    showBlinkIcon(e.clientX + 10, e.clientY);
    // console.log("✅ Icon shown for:", selectedText.substring(0, 40) + "...");
    console.log("✅ Icon shown for:", selectedText + "...");
  } else {
    hideBlinkIcon();
    currentSelection = null;
  }
});

// Hide on click outside
document.addEventListener("mousedown", (e) => {
  const isBlinkClick =
    (blinkIcon && blinkIcon.contains(e.target)) ||
    (popup && popup.contains(e.target));

  if (!isBlinkClick) {
    hideBlinkIcon();
    if (popup && !popup.contains(e.target)) {
      hidePopup();
    }
  }
});

// Hide on scroll
let scrollTimeout;
document.addEventListener(
  "scroll",
  () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      hideBlinkIcon();
      hidePopup();
      currentSelection = null;
    }, 100);
  },
  { passive: true }
);

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  if (blinkIcon) blinkIcon.remove();
  if (popup) popup.remove();
});

console.log("✅ BlinkAI ready - select text to get started!");
