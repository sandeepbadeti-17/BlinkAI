# ⚡ BlinkAI — Instant AI on Any Text

BlinkAI is a Chrome extension that brings AI directly to your reading flow.
Select any text on any page — summarize, explain, simplify, or ask anything about it — without switching tabs or breaking focus.

---

## ✨ What It Does

- **⚡ Blink** — floating badge appears on text selection, click to pick a preset action
- **📖 Explain / Summarize / Key points ** — 3 predefined prompt presets
- **💬 Custom prompt** — type your own instruction directly in the toolbar
- **🔁 Follow-up chat** — continue the conversation in the output panel without losing context
- **🔀 Model switcher** — switch between Gemini models on the fly
- **📧 Email support** — works on Gmail, Outlook, and any web-based email client
- **🖱️ Draggable panels** — move the toolbar and output panel anywhere on screen
- **🔒 Output persists** — the response panel stays open while you scroll or interact with the page

---

## 🏗️ Tech Stack

- Vanilla JavaScript (no framework — migration to Vite + React planned)
- Chrome Extension Manifest V3
- Google Gemini API

---

## 🌐 Models

| Model | Use |
|---|---|
| `gemini-3-flash-preview` | Default — fast, capable |
| `gemini-3.1-flash-lite-preview` | Lighter, lower latency |

Both are free-tier preview models. Switchable from the toolbar without reloading.

Endpoints:
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent
```

---

## 🧩 How It Works

```
Select text (3–500 words)
  → Toolbar appears with ⚡Blink badge
  → Pick a preset or type a custom prompt
  → Output panel opens with AI response
  → Continue chatting in the same panel
  → Switch models if you hit an error

## 📁 File Structure

```
blinkai/
├── manifest.json       # Extension config, permissions, content scripts
├── background.js       # Service worker — Gemini API calls
├── content.js          # UI injection — toolbar, output panel, drag, chat

```

---

## ⚠️ Challenges Solved

| Problem | Solution |
|---|---|
| CORS on API calls from content scripts | All fetch calls moved to `background.js` service worker |
| Text selection lost on popup open | Selection captured on `mouseup` before any UI renders |
| Output panel closing on page interaction | `stopPropagation` on panel + separate lifecycle from toolbar |
| Style bleed from host page CSS | Scoped class names + explicit inline resets on all elements |
| Model errors hard to recover from | Error bubbles show inline "Switch model and retry" hint |

---

## 🚀 Setup

1. Clone the repo
2. Open `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load Unpacked** → select the project folder
5. Add your Gemini API key in `background.js`

---

## 🔮 Planned

- Migrate to **Vite + React** with shadow DOM style isolation
- Output UI redesign — markdown rendering, copy button, source highlight
- Backend proxy for secure API key handling
- Rate limit UI with daily usage tracker

---

> ⚡ *BlinkAI is a speed layer for reading the internet — understand anything, instantly, without breaking your flow.*