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
        // UpBoost Design System
        brand: {
          bg: "#121724",      // Azul Profundo - Background Geral
          card: "#262626",    // Cinza Dark - Cards e Painéis
          accent: "#FFD300",  // Amarelo - Ações Primárias
        },
        // Textos
        text: {
          primary: "#FFFFFF",   // Branco para títulos
          secondary: "#A1A1AA", // Cinza Claro para descrições
          dark: "#000000",      // Preto para texto sobre amarelo
        },
        // Shadcn UI Colors (adaptadas ao tema)
        border: "#3f3f46",
        input: "#3f3f46",
        ring: "#FFD300",
        background: "#121724",
        foreground: "#FFFFFF",
        primary: {
          DEFAULT: "#FFD300",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#262626",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#27272a",
          foreground: "#A1A1AA",
        },
        accent: {
          DEFAULT: "#FFD300",
          foreground: "#000000",
        },
        popover: {
          DEFAULT: "#262626",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#262626",
          foreground: "#FFFFFF",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
