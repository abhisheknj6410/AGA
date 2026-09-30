import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"]
      }
    },
  },
  darkMode: "class",
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          background: "#F8F9FA",
          foreground: "#111827",
          primary: {
            50: "#e6fffa",
            100: "#b2f5ea",
            200: "#81e6d9",
            300: "#4fd1c5",
            400: "#38b2ac",
            500: "#0d9488",
            600: "#0f766e",
            700: "#115e59",
            800: "#134e4a",
            900: "#042f2e",
            DEFAULT: "#0d9488",
            foreground: "#ffffff",
          },
          focus: "#0d9488",
        }
      },
      dark: {
        colors: {
          background: "#09090b",
          foreground: "#f4f4f5",
          primary: {
            50: "#042f2e",
            100: "#134e4a",
            200: "#115e59",
            300: "#0f766e",
            400: "#0d9488",
            500: "#14b8a6",
            600: "#2dd4bf",
            700: "#5eead4",
            800: "#99f6e4",
            900: "#ccfbf1",
            DEFAULT: "#14b8a6",
            foreground: "#042f2e",
          },
          focus: "#14b8a6",
        }
      }
    }
  })],
};
