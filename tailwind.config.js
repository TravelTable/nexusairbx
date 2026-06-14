/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          cyan: "#00f5d4",
          purple: "#9b5de5",
          pink: "#f15bb5",
          blue: "#00bbf9",
          yellow: "#fee440",
        },
        ink: {
          950: "#070708",
          900: "#0a0a0c",
          850: "#0d0d10",
          800: "#121216",
          700: "#1a1a20",
          600: "#24242c",
        },
      },
      fontFamily: {
        display: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        xl2: "1rem",
        "2xl2": "1.25rem",
      },
      boxShadow: {
        "glow-cyan": "0 0 0 1px rgba(0,245,212,0.18), 0 10px 34px -10px rgba(0,245,212,0.4)",
        "glow-purple": "0 0 0 1px rgba(155,93,229,0.18), 0 10px 34px -10px rgba(155,93,229,0.4)",
        panel: "0 16px 50px -16px rgba(0,0,0,0.7)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-soft": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
