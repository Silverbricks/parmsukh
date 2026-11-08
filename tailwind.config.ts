import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { 50: "#eef5f0", 100: "#d5e8db", 200: "#a9d0b6", 500: "#2f6b45", 600: "#255a39", 700: "#1d4a2f", 800: "#163a25", 900: "#0f2a1a" },
        gold: { 100: "#f6edd6", 300: "#dcc07a", 500: "#b8963e", 600: "#9a7b2f", 700: "#7a6125" },
        ivory: { 50: "#fdfbf6", 100: "#faf6ec", 200: "#f2ebd9" },
        charcoal: { 500: "#4a4a48", 700: "#2f2f2d", 900: "#1c1c1b" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
