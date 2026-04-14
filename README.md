# ⚡ BlinkAI — Instant AI on Text Selection

BlinkAI is a Chrome extension that lets you **instantly understand any text on the web**.

👉 Select text → Click ⚡ Blink → Get a quick explanation

---

## ✨ Features

* ⚡ Instant summary / explanation
* 🎯 Works on any website
* 🧠 Optimized for short, clear answers
* 🚫 No copy-paste, no tab switching

---

## 🧩 How It Works

```text
Select text → Blink icon appears ⚡
Click → Popup opens
→ AI generates summary → Displayed instantly
```

---

## 🏗️ Tech Stack

* JavaScript (Vanilla)
* Chrome Extension APIs
* Google Gemini API

---

## 🌐 API Used

Model:

```text
gemini-3-flash-preview
```

Endpoint:

```text
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent
```

---

## ⚠️ Challenges Solved

* ❌ CORS issues → ✅ Fixed using background.js
* ❌ API integration errors → ✅ Correct model + endpoint
* ❌ UX friction → ✅ Floating action UI

---

## 🚀 Setup

1. Clone the repo
2. Go to `chrome://extensions`
3. Enable Developer Mode
4. Click "Load Unpacked"
5. Add your API key in `background.js`

---

## 🔮 Future Plans

* Multiple modes (Explain / Translate / Simplify)
* Better UI animations
* Backend for secure API handling

---

## 💡 Idea

> BlinkAI is a **speed layer for the internet** — helping users understand content instantly without breaking focus.

---

⚡ *Blink it. Understand instantly.*
