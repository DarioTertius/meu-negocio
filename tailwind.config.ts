import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--brand-50, #effaf6)",
          100: "var(--brand-100, #d6f2e6)",
          200: "var(--brand-200, #b0e4d0)",
          300: "var(--brand-300, #7cd0b4)",
          400: "var(--brand-400, #46b593)",
          500: "var(--brand-500, #249a7a)",
          600: "var(--brand-600, #177c63)",
          700: "var(--brand-700, #136350)",
          800: "var(--brand-800, #124f42)",
          900: "var(--brand-900, #104138)",
          950: "var(--brand-950, #08251f)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
