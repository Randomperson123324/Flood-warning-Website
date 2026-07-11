import type { Config } from "tailwindcss"

// Design tokens for the "liquid glass" visual language.
// Everything visual lives here — components should reach for these tokens
// instead of hardcoding colors/radii/durations, so re-theming later means
// editing this file only (see cid-coding-style: no hardcoded literals).
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // UI/body text — reads well in both Thai and Latin scripts.
        sans: ["var(--font-body)", "Noto Sans Thai Looped", "sans-serif"],
        // Numeric instrument readouts (water level cm, coordinates, timestamps)
        // — monospace gives the dashboard an "instrument panel" feel instead
        // of generic dashboard chrome.
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"],
      },
      colors: {
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          strong: "rgb(var(--surface-strong-rgb) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border-rgb) / <alpha-value>)",
        },
        base: {
          DEFAULT: "rgb(var(--base-rgb) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink-rgb) / <alpha-value>)",
          soft: "rgb(var(--ink-soft-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          soft: "rgb(var(--accent-soft-rgb) / <alpha-value>)",
        },
        status: {
          normal: "rgb(var(--status-normal-rgb) / <alpha-value>)",
          warning: "rgb(var(--status-warning-rgb) / <alpha-value>)",
          danger: "rgb(var(--status-danger-rgb) / <alpha-value>)",
        },
      },
      backdropBlur: {
        glass: "20px",
      },
      boxShadow: {
        glass: "0 8px 32px rgb(var(--shadow-rgb) / 0.24), inset 0 1px 0 rgb(255 255 255 / 0.15)",
        "glass-sm": "0 2px 12px rgb(var(--shadow-rgb) / 0.16), inset 0 1px 0 rgb(255 255 255 / 0.12)",
      },
      borderRadius: {
        glass: "1.75rem",
        "glass-sm": "1.125rem",
      },
      keyframes: {
        "liquid-rise": {
          "0%": { transform: "translateY(8%)" },
          "100%": { transform: "translateY(0%)" },
        },
        "liquid-wobble": {
          "0%, 100%": { transform: "translateX(-2%) scaleY(1)" },
          "50%": { transform: "translateX(2%) scaleY(1.03)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "liquid-rise": "liquid-rise 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
        "liquid-wobble": "liquid-wobble 4.5s ease-in-out infinite",
        shimmer: "shimmer 3.5s linear infinite",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      transitionTimingFunction: {
        glass: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
