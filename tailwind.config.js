/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
        serif: ['"Instrument Serif"', "ui-serif", "Georgia", "serif"],
      },
      colors: {
        navy: "#0B1426", // fixed brand navy (text on gold/sky)
        surface: "rgb(var(--c-surface) / <alpha-value>)", // page background
        card: "rgb(var(--c-card) / <alpha-value>)",
        card2: "rgb(var(--c-card2) / <alpha-value>)",
        white: "rgb(var(--c-hi) / <alpha-value>)", // overlay tint: white in dark mode, navy in light mode
        snow: "#FFFFFF",
        gold: "#FFCD00",
        sky: { DEFAULT: "#7FC8F8", soft: "#00C6D7" },
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        prayer: "#00C6D7",
        shift: "#B9A8F5",
        clash: "#FF6B6B",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
