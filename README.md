# ⚡ BlinkAI - Instant AI on Any Text

BlinkAI is a Chrome extension that lets you use AI directly on any webpage without switching tabs.

Select text → ask → get answers instantly.
No context switching. No broken focus.

---

## Why I Built This

Switching tabs to use AI kept interrupting my workflow.
BlinkAI solves that by bringing AI directly into the page you’re reading.

---

## What It Does

* Select text (1-500 words) on any webpage, email
* Floating toolbar appears instantly
* Run quick actions or type your own prompt
* Continue follow-up chat in the same panel
* Switch models if one fails
* Move UI panels anywhere on screen
* Output stays visible while you scroll

**Built-in actions:**
Summarize · Explain · Key points · Simplify · Action items

---

## Key Features

* ⚡ Inline AI - no tab switching
* 💬 Follow-up chat - keeps context
* 🔀 Model switching - recover from failures instantly
* 🧩 Works everywhere - websites, Gmail, Outlook
* 🖱️ Draggable UI - flexible interaction
* 🔒 Persistent output panel - doesn’t disappear on interaction

---

## Tech Stack

* Vanilla JavaScript (modular architecture)
* Chrome Extension (Manifest V3)
* Google Gemini API
* Custom Node-based build setup

---

## Architecture Overview

```
User selects text
  → content.js captures selection
  → toolbar injected into page
  → user action / prompt
  → request sent to background.js
  → Gemini API call
  → response returned
  → output panel renders + chat continues
```

---

## Folder Structure

```
blinkai/
├── js/
│   ├── constants.js
│   ├── state.js
│   ├── utils.js
│   ├── ui.toolbar.js
│   ├── ui.output.js
│   ├── ui.messages.js
│   ├── request.js
│   └── events.js
├── css/
│   └── blinkai.css
├── content.js        # entry point (DOM + UI injection)
├── background.js     # service worker (API handling)
├── manifest.json
├── build.js
├── package.json
└── dist/             # production build (load this into Chrome)
```

---

## Challenges & Solutions

* **CORS issues (content script → API)**
  → Moved API calls to `background.js`

* **Text selection getting lost**
  → Captured selection on `mouseup` before rendering UI

* **UI breaking due to host page styles**
  → Scoped styles + explicit resets

* **Panel closing on interaction**
  → Controlled event propagation + separate lifecycle

* **Handling model failures**
  → Inline “Switch model” fallback

---

## 🌐 Models

| Model | Use |
|---|---|
| `gemini-3-flash-preview` | Default - fast, capable |
| `gemini-3.1-flash-lite-preview` | Lighter, lower latency |

Both are free-tier preview models. Switchable from the toolbar without reloading.

Endpoints:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent
```

---

## Setup

```bash
git clone https://github.com/sandeepbadeti-17/BlinkAI/
cd blinkai
npm install
npm run build
```

Add your API key in `background.js`:

```js
const API_KEY = "your-gemini-api-key";
```

Load the extension:

* Open `chrome://extensions`
* Enable **Developer Mode**
* Click **Load Unpacked**
* Select the `dist/` folder

---

## Development

```bash
npm run watch
```

Then refresh the extension from `chrome://extensions`.

---

## Notes

* Not published on Chrome Web Store yet
* Firefox support planned

---

## Roadmap

* Migrate to Vite + React (with Shadow DOM isolation)
* Improved output UI (Markdown, copy, highlights)
* Backend proxy for secure API key handling
* Usage tracking & rate limiting UI
* Local PDF support not implemented yet (working on it)

---

## What This Project Demonstrates

* Chrome Extension architecture (Manifest V3)
* DOM manipulation and UI injection
* Content script ↔ service worker communication
* API integration with error handling
* Modular frontend design without frameworks

---

**Built to solve my own problem. Turns out it’s actually useful.**
