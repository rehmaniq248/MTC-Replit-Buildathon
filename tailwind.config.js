/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        navy: "#0B1426",
        card: "#182B49",
        card2: "#22385C",
        gold: "#FFCD00",
        sky: { DEFAULT: "#7FC8F8", soft: "#00C6D7" },
        ink: "#F2F0E9",
        prayer: "#7EE0B5",
        shift: "#B9A8F5",
        clash: "#FF6B6B",
        muted: "#A9B4C6",
      },
    },
  },
  plugins: [],
};
