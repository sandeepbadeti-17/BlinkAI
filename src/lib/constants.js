// src/lib/constants.js

export const MODELS = [
  { id: "gemini-3-flash-preview",  label: "Gemini 3 Flash"         },
  { id: "gemini-3.1-flash-lite",   label: "Gemini 3.1 Flash Lite"  },
];

export const MODEL_URLS = {
  "gemini-3-flash-preview":  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
  "gemini-3.1-flash-lite":   "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
};

export const PRESETS = [
  { icon: "✦", label: "Summarize",    prefix: "Summarize this in 3 concise bullet points:\n\n"        },
  { icon: "◈", label: "Explain",      prefix: "Explain this clearly as if I'm new to the topic:\n\n"  },
  { icon: "◎", label: "Key points",   prefix: "Extract the 3 most important takeaways from this:\n\n" },
  { icon: "◇", label: "Simplify",     prefix: "Rewrite this in plain simple language:\n\n"            },
  { icon: "⬡", label: "Action items", prefix: "List any action items or next steps from this:\n\n"    },
];

export const MIN_WORDS = 1;
export const MAX_WORDS = 500;
