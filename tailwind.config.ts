import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf6", 100: "#d6f2e6", 200: "#b0e4d0", 300: "#7cd0b4",
          400: "#46b593", 500: "#249a7a", 600: "#177c63", 700: "#136350",
          800: "#124f42", 900: "#104138", 950: "#08251f",
        },
      },
    },
  },
  plugins: [],
};
export default config;
