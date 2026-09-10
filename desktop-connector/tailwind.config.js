/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./src/renderer/**/*.{js,jsx,ts,tsx,html}", "../src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--nx-font-body)', 'Segoe UI', 'sans-serif'],
        display: ['var(--nx-font-display)', 'Arial Narrow', 'sans-serif'],
        mono: ['var(--nx-font-code)', 'monospace'],
      },
      colors: {
        background: "rgb(var(--connector-background) / <alpha-value>)",
        foreground: "rgb(var(--connector-foreground) / <alpha-value>)",
        panel: "rgb(var(--connector-panel) / <alpha-value>)",
        elevated: "rgb(var(--connector-elevated) / <alpha-value>)",
        muted: "rgb(var(--connector-muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--connector-muted-foreground) / <alpha-value>)",
        line: "rgb(var(--connector-line) / <alpha-value>)",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(0,0,0,.35)",
        violet: "0 0 24px rgba(124,58,237,.22)",
        warning: "0 0 24px rgba(245,158,11,.16)",
      },
      spacing: { 13: "3.25rem" },
    },
  },
  plugins: [],
};
