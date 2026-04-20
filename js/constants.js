// js/constants.js - BlinkAI v3 config & constants

export const MODELS = [
  { id: "gemini-3-flash-preview",        label: "Gemini 3 Flash" },
  { id: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite" },
];

export const PRESETS = [
  { icon: "✦", label: "Summarize",    prefix: "Summarize this in 3 concise bullet points:\n\n" },
  { icon: "◈", label: "Explain",      prefix: "Explain this clearly as if I'm new to the topic:\n\n" },
  { icon: "◎", label: "Key points",   prefix: "Extract the 3 most important takeaways from this:\n\n" },
  { icon: "◇", label: "Simplify",     prefix: "Rewrite this in plain simple language:\n\n" },
  { icon: "⬡", label: "Action items", prefix: "List any action items or next steps from this:\n\n" },
];

export const SEND_ICON_SVG = `
  <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
    <path d="M1 6.5L12 1L7 12L5.5 7L1 6.5Z"
          fill="#0d0d0d" stroke="#0d0d0d"
          stroke-width="0.8" stroke-linejoin="round"/>
  </svg>`;
