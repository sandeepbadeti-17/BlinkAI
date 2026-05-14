/** @type {import('tailwindcss').Config} */
export default {
  // We'll inject Tailwind styles into Shadow DOM, so point content at src
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blink: {
          bg: "#0d0d0d",
          surface: "#1a1a1a",
          border: "#2a2a2a",
          accent: "#ffc328",
          muted: "rgba(255,255,255,0.45)",
          text: "#f0f0f0",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
