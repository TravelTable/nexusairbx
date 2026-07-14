/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./src/renderer/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
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
