const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    path.join(__dirname, "src/**/*.{js,jsx,ts,tsx}"),
    path.join(__dirname, "public-frontend/**/*.{js,jsx,ts,tsx}"),
    `!${path.join(__dirname, "public-frontend/{out,.next}/**/*")}`,
    `!${path.join(__dirname, "build/**/*")}`,
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        canvas: "var(--nx-canvas)",
        workspace: "var(--nx-depth)",
        sidebar: "var(--nx-work)",
        surface: {
          1: "var(--nx-work)",
          2: "var(--nx-field)",
          3: "var(--nx-field-strong)",
          overlay: "var(--nx-work)",
        },
      },
      fontFamily: {
        display: ["var(--nx-font-display)", '"Arial Narrow"', "sans-serif"],
        sans: ["var(--nx-font-body)", '"Segoe UI"', "sans-serif"],
        mono: ["var(--nx-font-code)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "var(--nx-radius-overlay)",
        md: "var(--nx-radius-field)",
        sm: "2px",
        xl2: "var(--nx-radius-overlay)",
        "2xl2": "var(--nx-radius-overlay)",
      },
      boxShadow: {
        panel: "none",
      },
    },
  },
  plugins: [],
}
