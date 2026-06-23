import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SmartVan brand
        sv: {
          yellow: "#FFB800",
          "yellow-light": "#FFF8E6",
          "yellow-dark": "#CC9200",
          navy: "#1B2B6B",
          "navy-light": "#EEF0F8",
          teal: "#00C48C",
          "teal-light": "#E6FAF4",
          red: "#FF4B4B",
          "red-light": "#FFF0F0",
          orange: "#FF8C42",
          "orange-light": "#FFF4EE",
          green: "#27AE60",
          "green-light": "#EDFBF4",
          blue: "#4A90E2",
          "blue-light": "#EEF5FD",
          text: "#1A1A2E",
          muted: "#8A94A6",
          border: "#EAECF0",
          bg: "#F5F6FA",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1B2B6B",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F5F6FA",
          foreground: "#1A1A2E",
        },
        destructive: {
          DEFAULT: "#FF4B4B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F5F6FA",
          foreground: "#8A94A6",
        },
        accent: {
          DEFAULT: "#FFB800",
          foreground: "#1A1A2E",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A2E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
